// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ProofToken (PROOF) — the demo airdrop token for HumanProof
/// @notice A minimal ERC-20. `claim()` mints CLAIM_AMOUNT to the caller so the airdrop demo can show
/// REAL testnet value landing in a verified human's Privy embedded wallet, with the balance change
/// visible on screen.
///
/// Where the Sybil gate lives (important, and honest): one-human-one-claim is enforced by the
/// HumanProof layer, NOT by this token. The airdrop app only ever calls `claim()` AFTER `/attest`
/// has sealed the claim for that human — and `/attest` dedupes on the salted World nullifier, so the
/// block is keyed on the HUMAN, not the wallet or the browser (a fresh wallet can't game it). That
/// is the whole point of the demo. This token is intentionally thin.
///
/// Production hardening (noted, not built — same stance as the seal's Chronos-V note): gate the mint
/// behind an issuer authorization so PROOF can ONLY be minted through the verified flow. For the
/// demo, `claim()` is open and the verified-human gate is demonstrated at the app/layer level.
contract ProofToken {
    string public constant name = "HumanProof PROOF";
    string public constant symbol = "PROOF";
    uint8 public constant decimals = 18;
    uint256 public constant CLAIM_AMOUNT = 500 * 1e18; // 500 PROOF per human

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Claimed(address indexed to, uint256 amount);

    /// @notice Mint CLAIM_AMOUNT PROOF to the caller's wallet. The airdrop app calls this only after
    /// the human has passed the /attest one-per-human gate.
    function claim() external {
        balanceOf[msg.sender] += CLAIM_AMOUNT;
        totalSupply += CLAIM_AMOUNT;
        emit Transfer(address(0), msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender, CLAIM_AMOUNT);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= value, "PROOF: allowance");
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - value;
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(balanceOf[from] >= value, "PROOF: balance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
