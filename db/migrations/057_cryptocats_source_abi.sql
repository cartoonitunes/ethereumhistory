-- Migration 057: Add source code and ABI to CryptoCats test contracts

UPDATE contracts SET
  source_code = '/**
 * CryptoCatsMarket - Pre-launch Test Contract 1
 *
 * Contract address:  0xD23AdE68C693264Aa9e8f8303F912A3E54718456
 * Deploy block:      4530388
 * Deploy date:       2017-11-11 (one day before CryptoCats public launch)
 * Deploy tx:         0x94efb7f...
 *
 * Source reconstructed by EthereumHistory.com
 * https://www.ethereumhistory.com/contract/0xD23AdE68C693264Aa9e8f8303F912A3E54718456
 *
 * Compilation: Solidity 0.4.18 + optimizer ON
 * Verification status: near_exact_match
 *   - Reconstructed: 5715 bytes
 *   - On-chain:      5823 bytes
 *   - Match:         98.1%
 *
 * Notes:
 *   This was the first pre-launch test of the CryptoCats marketplace.
 *   It introduced the catName string field in the Offer struct and the
 *   allInitialOwnersAssigned() function that bakes all 12 cats into storage.
 *   The 108-byte gap is in the cat initialization block; the exact compiler
 *   build (possibly a pre-release 0.4.18 nightly) has not been recovered.
 *
 *   The verified CryptoCats v3 production contract is:
 *   0x088C6Ad962812b5Aa905BA6F3c5c145f9D4C079f (Solidity 0.4.19)
 */

pragma solidity ^0.4.18;

contract CryptoCatsMarket {

    string public imageHash = "3b82cfd5fb39faff3c2c9241ca5a24439f11bdeaa7d6c0771eb782ea7c963917";
    address owner;
    string public standard = ''CryptoCats'';
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public _totalSupply;
    bool public allCatsAssigned = false;
    bool public allInitialOwnersAssigned = false;
    uint public catsRemainingToAssign = 0;
    mapping (uint => address) public catIndexToAddress;
    mapping (address => uint) public balanceOf;

    struct Offer {
        bool isForSale;
        address seller;
        string catName;
        uint catIndex;
    }

    mapping (uint => Offer) public catDetails;

    event Assign(address indexed to, uint256 catIndex);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function CryptoCatsMarket() payable {
        owner = msg.sender;
        _totalSupply = 12;
        catsRemainingToAssign = _totalSupply;
        name = "CRYPTOCATS";
        symbol = "CCAT";
        decimals = 0;
    }

    function allInitialOwnersAssigned() {
        require(msg.sender == owner);
        catDetails[0] = Offer(false, msg.sender, "Cat 0", 0);
        catDetails[1] = Offer(false, msg.sender, "Cat 1", 1);
        catDetails[2] = Offer(false, msg.sender, "Cat 2", 2);
        catDetails[3] = Offer(false, msg.sender, "Cat 3", 3);
        catDetails[4] = Offer(false, msg.sender, "Cat 4", 4);
        catDetails[5] = Offer(false, msg.sender, "Cat 5", 5);
        catDetails[6] = Offer(false, msg.sender, "Cat 6", 6);
        catDetails[7] = Offer(false, msg.sender, "Cat 7", 7);
        catDetails[8] = Offer(false, msg.sender, "Cat 8", 8);
        catDetails[9] = Offer(false, msg.sender, "Cat 9", 9);
        catDetails[10] = Offer(false, msg.sender, "Cat 10", 10);
        catDetails[11] = Offer(false, msg.sender, "Cat 11", 11);
        allCatsAssigned = true;
    }

    function claimCat(uint catIndex) {
        require(!allCatsAssigned);
        require(catsRemainingToAssign != 0);
        require(catIndexToAddress[catIndex] == 0x0);
        require(catIndex < _totalSupply);
        catIndexToAddress[catIndex] = msg.sender;
        balanceOf[msg.sender]++;
        catsRemainingToAssign--;
        Assign(msg.sender, catIndex);
    }

    function getCatDetail(uint catIndex) public returns (uint _catIndex, bool isForSale, address seller, string catName) {
        Offer storage offer = catDetails[catIndex];
        _catIndex = offer.catIndex;
        isForSale = offer.isForSale;
        seller = offer.seller;
        catName = offer.catName;
    }

    function transfer(address _to, uint256 _value) returns (bool success) {
        if (_value < _totalSupply && catIndexToAddress[_value] == msg.sender && balanceOf[msg.sender] > 0) {
            balanceOf[msg.sender]--;
            catIndexToAddress[_value] = _to;
            balanceOf[_to]++;
            Transfer(msg.sender, _to, _value);
            success = true;
        } else {
            success = false;
        }
        return success;
    }

    function balanceOf(address _owner) constant returns (uint256 balance) {
        require(balanceOf[_owner] != 0);
        return balanceOf[_owner];
    }

    function totalSupply() constant returns (uint256 totalSupply) {
        return _totalSupply;
    }

    function getCatOwner(uint256 catIndex) public returns (address) {
        require(catIndexToAddress[catIndex] != 0x0);
        return catIndexToAddress[catIndex];
    }

    function getContractOwner() public returns (address) {
        return owner;
    }

}
',
  abi = '[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"catIndex","type":"uint256"}],"name":"claimCat","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"catIndex","type":"uint256"}],"name":"getCatDetail","outputs":[{"name":"_catIndex","type":"uint256"},{"name":"isForSale","type":"bool"},{"name":"seller","type":"address"},{"name":"catName","type":"string"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"totalSupply","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"catIndexToAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"catDetails","outputs":[{"name":"isForSale","type":"bool"},{"name":"seller","type":"address"},{"name":"catName","type":"string"},{"name":"catIndex","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"getContractOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"imageHash","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"standard","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"allInitialOwnersAssigned","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allCatsAssigned","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"catIndex","type":"uint256"}],"name":"getCatOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"catsRemainingToAssign","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":true,"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"catIndex","type":"uint256"}],"name":"Assign","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]'
WHERE address = '0xD23AdE68C693264Aa9e8f8303F912A3E54718456';

UPDATE contracts SET
  source_code = '/**
 * CryptoCatsMarket - Pre-launch Test Contract 2
 *
 * Contract address:  0x78eea094e1d30141ccade64f8d29a7bfcc921f9e
 * Deploy block:      4532036
 * Deploy date:       2017-11-11 (one day before CryptoCats public launch)
 * Deploy tx:         0x51d6871d7c3021d6392c0bbc6f4aa88be400f066b1ebeb9317e09c27449f5c95
 *
 * Source reconstructed by EthereumHistory.com
 * https://www.ethereumhistory.com/contract/0x78eea094e1d30141ccade64f8d29a7bfcc921f9e
 *
 * Compilation: Solidity 0.4.18, optimizer OFF
 * Verification status: near_exact_match
 *   - Reconstructed: 8137 bytes
 *   - On-chain:      8451 bytes
 *   - Match:         96.3%
 *
 * Notes:
 *   This was the second pre-launch test of the CryptoCats marketplace,
 *   deployed on the same day as Test Contract 1 (0xD23A...).
 *
 *   Key differences from Test Contract 1:
 *   - Compiled WITHOUT optimizer (produces larger bytecode)
 *   - Struct field order: {bool isForSale; uint catIndex; address seller; string catName;}
 *   - getCatDetail() returns (bool, uint, address, string) — v3-style order
 *   - allInitialOwnersAssigned() at runtime ONLY sets allCatsAssigned=true
 *   - All 12 cat Offer structs are initialized in the constructor (dead code at runtime)
 *   - seller = 0x0 (not msg.sender)
 *   - imageHash was a placeholder string ("INSERT ACTUAL HASH HERE")
 *
 *   The 314-byte gap is dead code from the constructor-only internal cat init
 *   function. The same root cause as T1 (108 bytes), but larger because the
 *   optimizer was disabled — all that code is preserved verbatim.
 *
 *   The verified CryptoCats v3 production contract is:
 *   0x088C6Ad962812b5Aa905BA6F3c5c145f9D4C079f (Solidity 0.4.19)
 */

pragma solidity ^0.4.18;

contract CryptoCatsMarket {

    string public imageHash = "INSERT ACTUAL HASH HERE";
    address owner;
    string public standard = ''CryptoCats'';
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public _totalSupply;
    bool public allCatsAssigned = false;
    bool public allInitialOwnersAssigned = false;
    uint public catsRemainingToAssign = 0;
    mapping (uint => address) public catIndexToAddress;
    mapping (address => uint) public balanceOf;

    struct Offer {
        bool isForSale;
        uint catIndex;
        address seller;
        string catName;
    }

    mapping (uint => Offer) public catDetails;

    event Assign(address indexed to, uint256 catIndex);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function CryptoCatsMarket() payable {
        owner = msg.sender;
        _totalSupply = 12;
        catsRemainingToAssign = _totalSupply;
        name = "CRYPTOCATS";
        symbol = "CCAT";
        decimals = 0;
    }

    function allInitialOwnersAssigned() {
        require(msg.sender == owner);
        catDetails[0] = Offer(false, 0, 0x0, "Cat 0");
        catDetails[1] = Offer(false, 1, 0x0, "Cat 1");
        catDetails[2] = Offer(false, 2, 0x0, "Cat 2");
        catDetails[3] = Offer(false, 3, 0x0, "Cat 3");
        catDetails[4] = Offer(false, 4, 0x0, "Cat 4");
        catDetails[5] = Offer(false, 5, 0x0, "Cat 5");
        catDetails[6] = Offer(false, 6, 0x0, "Cat 6");
        catDetails[7] = Offer(false, 7, 0x0, "Cat 7");
        catDetails[8] = Offer(false, 8, 0x0, "Cat 8");
        catDetails[9] = Offer(false, 9, 0x0, "Cat 9");
        catDetails[10] = Offer(false, 10, 0x0, "Cat 10");
        catDetails[11] = Offer(false, 11, 0x0, "Cat 11");
        allCatsAssigned = true;
    }

    function claimCat(uint catIndex) {
        require(!allCatsAssigned);
        require(catsRemainingToAssign != 0);
        require(catIndexToAddress[catIndex] == 0x0);
        require(catIndex < _totalSupply);
        catIndexToAddress[catIndex] = msg.sender;
        balanceOf[msg.sender]++;
        catsRemainingToAssign--;
        Assign(msg.sender, catIndex);
    }

    function getCatDetail(uint catIndex) public returns (bool isForSale, uint _catIndex, address seller, string catName) {
        Offer storage offer = catDetails[catIndex];
        isForSale = offer.isForSale;
        _catIndex = offer.catIndex;
        seller = offer.seller;
        catName = offer.catName;
    }

    function transfer(address _to, uint256 _value) returns (bool success) {
        if (_value < _totalSupply && catIndexToAddress[_value] == msg.sender && balanceOf[msg.sender] > 0) {
            balanceOf[msg.sender]--;
            catIndexToAddress[_value] = _to;
            balanceOf[_to]++;
            Transfer(msg.sender, _to, _value);
            success = true;
        } else {
            success = false;
        }
        return success;
    }

    function balanceOf(address _owner) constant returns (uint256 balance) {
        require(balanceOf[_owner] != 0);
        return balanceOf[_owner];
    }

    function totalSupply() constant returns (uint256 totalSupply) {
        return _totalSupply;
    }

    function getCatOwner(uint256 catIndex) public returns (address) {
        require(catIndexToAddress[catIndex] != 0x0);
        return catIndexToAddress[catIndex];
    }

    function getContractOwner() public returns (address) {
        return owner;
    }

}
',
  abi = '[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"catIndex","type":"uint256"}],"name":"claimCat","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"catIndex","type":"uint256"}],"name":"getCatDetail","outputs":[{"name":"isForSale","type":"bool"},{"name":"_catIndex","type":"uint256"},{"name":"seller","type":"address"},{"name":"catName","type":"string"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"totalSupply","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"catIndexToAddress","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"catDetails","outputs":[{"name":"isForSale","type":"bool"},{"name":"catIndex","type":"uint256"},{"name":"seller","type":"address"},{"name":"catName","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"_totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"getContractOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"imageHash","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"standard","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"allInitialOwnersAssigned","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"allCatsAssigned","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"success","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"catIndex","type":"uint256"}],"name":"getCatOwner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"catsRemainingToAssign","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[],"payable":true,"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"catIndex","type":"uint256"}],"name":"Assign","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]'
WHERE address = '0x78eea094e1d30141ccade64f8d29a7bfcc921f9e';
