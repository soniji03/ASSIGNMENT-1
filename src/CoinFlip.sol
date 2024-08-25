// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CoinFlip {
    event CoinFlipped(address player, uint256 bet, bool won);

    function flip(bool _guess) external payable returns (bool) {
        require(msg.value > 0, "Bet amount must be greater than 0");

        // Generate a pseudo-random number (Note: This is not secure for production)
        bool result = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty, msg.sender))) % 2 == 0;

        bool won = (_guess == result);

        if (won) {
            payable(msg.sender).transfer(msg.value * 2);
        }

        emit CoinFlipped(msg.sender, msg.value, won);

        return won;
    }
}