// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRegistry {
    function register(
        string calldata label,
        address owner,
        address subregistry,
        address resolver,
        uint256 roleBitmap,
        uint64 expires
    ) external returns (uint256 tokenId);
}

interface IResolver {
    function setAddr(bytes32 node, address addr_) external;
}

/// @title HumanProofRegistrar
/// @notice Issues `<label>.humanproof.eth` subnames, but ONLY to a caller presenting a valid
/// "humanity voucher" — an EIP-712 signature from the trusted HumanProof issuer attesting that
/// this claimant is a verified, unique human (via World Selfie Check). Each human's nullifier
/// can claim exactly once.
///
/// Honest boundary (matches our README/demo): the "is this a unique human?" check itself is
/// World's, performed off-chain. What THIS contract enforces on-chain is:
///   (1) the voucher is signed by the trusted issuer,
///   (2) it authorises exactly this `claimant` and `label`,
///   (3) the human's `nullifierHash` has never been used before (one human, one name).
/// So a name can only be claimed by a verified, unique human — and that rule lives in the
/// contract, not the app. No World proof is faked on-chain.
contract HumanProofRegistrar {
    IRegistry public immutable registry;    // our UserRegistry (subnames under humanproof.eth)
    IResolver public immutable resolver;     // our PermissionedResolver
    bytes32   public immutable parentNode;   // namehash(humanproof.eth)
    address   public immutable issuer;       // HumanProof issuer — the EIP-712 voucher signer
    uint256   public immutable subnameRoles; // roles granted to the subname owner on mint

    uint64 public constant EXPIRY = 4102444800; // 2100-01-01: subnames effectively don't expire

    bytes32 private immutable _domainSeparator;
    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address claimant,bytes32 labelHash,uint256 nullifierHash,uint256 deadline)");

    /// nullifierHash => already claimed. This is the on-chain "one human, one name" ledger.
    mapping(uint256 => bool) public usedNullifier;

    event Claimed(string label, address indexed claimant, uint256 indexed nullifierHash, uint256 tokenId);

    error InvalidSignature();
    error NullifierAlreadyUsed();
    error VoucherExpired();

    constructor(
        address _registry,
        address _resolver,
        bytes32 _parentNode,
        address _issuer,
        uint256 _subnameRoles
    ) {
        registry = IRegistry(_registry);
        resolver = IResolver(_resolver);
        parentNode = _parentNode;
        issuer = _issuer;
        subnameRoles = _subnameRoles;
        _domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("HumanProof"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Claim `<label>.humanproof.eth` for `claimant` using an issuer-signed humanity voucher.
    /// Reverts unless the voucher is validly signed, unexpired, and the nullifier is unused.
    function claim(
        string calldata label,
        address claimant,
        uint256 nullifierHash,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint256 tokenId) {
        if (block.timestamp > deadline) revert VoucherExpired();
        if (usedNullifier[nullifierHash]) revert NullifierAlreadyUsed();

        bytes32 labelHash = keccak256(bytes(label));
        bytes32 structHash = keccak256(abi.encode(CLAIM_TYPEHASH, claimant, labelHash, nullifierHash, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _domainSeparator, structHash));
        if (_recover(digest, signature) != issuer) revert InvalidSignature();

        usedNullifier[nullifierHash] = true; // mark before external calls (checks-effects-interactions)

        tokenId = registry.register(label, claimant, address(0), address(resolver), subnameRoles, EXPIRY);
        bytes32 node = keccak256(abi.encodePacked(parentNode, labelHash));
        resolver.setAddr(node, claimant);

        emit Claimed(label, claimant, nullifierHash, tokenId);
    }

    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert InvalidSignature();
        return signer;
    }
}
