// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Airdroppa's 500 PROOF campaign. Only issuer-authorized verified humans may claim.
/// The issuer checks World/credential ownership off-chain. The contract enforces the
/// signed recipient, campaign deployment, expiry and one claim per anonymous claimId.
contract ProofToken {
    string public constant name = "Airdroppa PROOF";
    string public constant symbol = "PROOF";
    uint8 public constant decimals = 18;
    uint256 public constant CLAIM_AMOUNT = 500 * 1e18;
    address public immutable issuer;
    bytes32 private immutable DOMAIN_SEPARATOR;
    bytes32 private constant CLAIM_TYPEHASH = keccak256("Claim(bytes32 claimId,address recipient,uint256 deadline)");
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(bytes32 => address) public claimedBy;
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Claimed(bytes32 indexed claimId, address indexed recipient, uint256 amount);
    error InvalidAuthorization();
    error AlreadyClaimed();
    error Expired();

    constructor(address authorizedIssuer) {
        require(authorizedIssuer != address(0), "issuer required");
        issuer = authorizedIssuer;
        DOMAIN_SEPARATOR = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("Airdroppa"), keccak256("1"), block.chainid, address(this)
        ));
    }
    function claim(bytes32 claimId, uint256 deadline, bytes calldata signature) external {
        if (claimedBy[claimId] != address(0)) revert AlreadyClaimed();
        if (block.timestamp > deadline) revert Expired();
        if (signature.length != 65) revert InvalidAuthorization();
        bytes32 r; bytes32 s; uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (uint256(s) > 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0 || (v != 27 && v != 28)) revert InvalidAuthorization();
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR,
            keccak256(abi.encode(CLAIM_TYPEHASH, claimId, msg.sender, deadline))));
        if (ecrecover(digest, v, r, s) != issuer) revert InvalidAuthorization();
        claimedBy[claimId] = msg.sender;
        balanceOf[msg.sender] += CLAIM_AMOUNT;
        totalSupply += CLAIM_AMOUNT;
        emit Transfer(address(0), msg.sender, CLAIM_AMOUNT);
        emit Claimed(claimId, msg.sender, CLAIM_AMOUNT);
    }
    function transfer(address to, uint256 value) external returns (bool) { _transfer(msg.sender, to, value); return true; }
    function approve(address spender, uint256 value) external returns (bool) { allowance[msg.sender][spender] = value; emit Approval(msg.sender, spender, value); return true; }
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender]; require(allowed >= value, "allowance");
        allowance[from][msg.sender] = allowed - value; _transfer(from, to, value); return true;
    }
    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "zero recipient"); require(balanceOf[from] >= value, "balance");
        balanceOf[from] -= value; balanceOf[to] += value; emit Transfer(from, to, value);
    }
}
