// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Admin {
    address public admin;

    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);

    constructor() {
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin");

        address oldAdmin = admin;
        admin = newAdmin;

        emit AdminTransferred(oldAdmin, newAdmin);
    }
}
