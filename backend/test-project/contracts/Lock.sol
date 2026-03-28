// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

contract Lock {
    uint public unlockTime;
    address payable public owner;

    event Withdrawal(uint amount, uint when);

    constructor() payable {
        owner = payable(msg.sender);
    }

    function withdraw() public {
        require(msg.sender == owner, "You aren't the owner");
        emit Withdrawal(address(this).balance, block.timestamp);
        owner.transfer(address(this).balance);
    }
}
