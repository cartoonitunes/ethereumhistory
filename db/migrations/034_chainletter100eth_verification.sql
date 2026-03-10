-- Migration 034: Add verification proof data for 0x020522bf9b8ed6ff41e2fa6765a17e20e2767d64
-- EarlyChainLetter100ETH deployed August 9, 2015 (block 60,143)
-- Byte-for-byte verified with soljson-v0.1.1+commit.6ff4cd6, optimizer ON, 744 bytes

UPDATE contracts SET
  compiler_language = 'solidity',
  compiler_commit = '6ff4cd6',
  compiler_repo = 'ethereum/solidity',
  verification_method = 'exact_bytecode_match',
  verification_proof_url = 'https://github.com/cartoonitunes/chainletter100eth-verification',
  verification_notes = 'Compiled with soljson-v0.1.1+commit.6ff4cd6, optimizer ON. Source is a 100 ETH tree-payout chain letter (MyScheme.sol) with three named read functions: getContractBalance(), getNumInvestors(), getNumNextLevel(). Key difference from the 10 ETH variant (0xa327075a): when numInvestorsMinusOne <= 2, the 100 ETH version sets treeDepth = 1 without sending to myTree[0]. The 10 ETH version sends the full balance to myTree[0] at that point. Storage layout: slot 0 = treeBalance, slot 1 = numInvestorsMinusOne, slot 2 = treeDepth, slot 3 = myTree (dynamic array length). Selector 0xb521a81d = getNumNextLevel(), confirmed via bytecode: returns slot3 - slot1 - 1 (available tree slots).',
  source_code = 'contract MyScheme {
 
    uint treeBalance;
    uint numInvestorsMinusOne;
    uint treeDepth;
    address[] myTree;
 
    function MyScheme() {
        treeBalance = 0;
        myTree.length = 6;
        myTree[0] = msg.sender;
        numInvestorsMinusOne = 0;
    }
   
    function getContractBalance() constant returns (uint a){
        return treeBalance;
    }
   
    function getNumInvestors() constant returns (uint a){
        return numInvestorsMinusOne+1;
    }
   
    function getNumNextLevel() constant returns (uint a){
        return myTree.length - numInvestorsMinusOne - 1;
    }
   
    function() {
        uint amount = msg.value;
        if (amount>=100000000000000000000){
            numInvestorsMinusOne+=1;
            myTree[numInvestorsMinusOne]=msg.sender;
            amount-=100000000000000000000;
            treeBalance+=100000000000000000000;
            if (numInvestorsMinusOne<=2){
                treeDepth=1;
            }
            else if (numInvestorsMinusOne+1==myTree.length){
                    for(uint i=myTree.length-3*(treeDepth+1);i<myTree.length-treeDepth-2;i++){
                        myTree[i].send(50000000000000000000);
                        treeBalance-=50000000000000000000;
                    }
                    uint eachLevelGets = treeBalance/(treeDepth+1)-1;
                    uint numInLevel = 1;
                    for(i=0;i<myTree.length-treeDepth-2;i++){
                        myTree[i].send(eachLevelGets/numInLevel-1);
                        treeBalance -= eachLevelGets/numInLevel-1;
                        if (numInLevel*(numInLevel+1)/2 -1== i){
                            numInLevel+=1;
                        }
                    }
                    myTree.length+=treeDepth+3;
                    treeDepth+=1;
            }
        }
                treeBalance+=amount;
    }
}'
WHERE address = '0x020522bf9b8ed6ff41e2fa6765a17e20e2767d64';
