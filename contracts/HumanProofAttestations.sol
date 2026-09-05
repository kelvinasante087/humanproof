// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title HumanProofAttestations
/// @notice Minimal, from-scratch seal for HumanProof. The app's worker anchors an action
/// attestation on Base: the salted nullifier hash (an anonymous per-human fingerprint), a content
/// hash of the action, the calling app's id, and a timestamp. Only anonymous fingerprints ever go
/// on-chain — never the raw World nullifier, never personal data, never the action's content.
///
/// One seal per (human, action): the dedupe key is keccak256(abi.encode(nullifierHash, contentHash,
/// appId)), computed on-chain so it can't be spoofed. A duplicate reverts AlreadySealed — the final
/// backstop under the app/DB-layer rate limit. Sealing is worker-gated so only HumanProof's server
/// can write (spam/gas protection); the owner can rotate the worker.
contract HumanProofAttestations {
    address public owner;
    mapping(address => bool) public isWorker;
    mapping(bytes32 => bool) public isSealed; // dedupeKey => already sealed

    event Sealed(
        bytes32 indexed dedupeKey,
        uint256 indexed nullifierHash,
        bytes32 contentHash,
        string appId,
        uint256 timestamp
    );
    event WorkerSet(address indexed worker, bool allowed);

    error NotOwner();
    error NotWorker();
    error AlreadySealed();

    constructor(address worker) {
        owner = msg.sender;
        isWorker[worker] = true;
        emit WorkerSet(worker, true);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @notice Authorize or revoke a sealing worker.
    function setWorker(address worker, bool allowed) external onlyOwner {
        isWorker[worker] = allowed;
        emit WorkerSet(worker, allowed);
    }

    /// @notice Seal one action. Reverts AlreadySealed on a duplicate (human, action).
    /// @return dedupeKey the canonical key that identifies this (human, action) pair.
    function seal(uint256 nullifierHash, bytes32 contentHash, string calldata appId)
        external
        returns (bytes32 dedupeKey)
    {
        if (!isWorker[msg.sender]) revert NotWorker();
        dedupeKey = keccak256(abi.encode(nullifierHash, contentHash, appId));
        if (isSealed[dedupeKey]) revert AlreadySealed();
        isSealed[dedupeKey] = true;
        emit Sealed(dedupeKey, nullifierHash, contentHash, appId, block.timestamp);
    }
}
