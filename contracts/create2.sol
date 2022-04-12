
contract Dummy {
    bytes32 _param;
    constructor(bytes32 param) { _param = param; }
}

contract TestCreate2 {
    event Deployed(uint index, address addr, bytes32 initCodeHash, bytes initCode);

    constructor(bytes32[] memory salts, bytes32[] memory params) {
        for (uint i = 0; i < salts.length; i++) {
            Dummy dummy = new Dummy{ salt: salts[i] }(params[i]);
            bytes memory initCode = abi.encodePacked(type(Dummy).creationCode, params[i]);
            emit Deployed(i, address(dummy), keccak256(initCode), initCode);
        }
    }
}
