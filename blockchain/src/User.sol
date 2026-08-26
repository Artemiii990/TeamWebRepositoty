// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UserRegistry {
    enum UserRole {
        NONE,
        MERCHANT,
        CUSTOMER
    }

    struct User {
        address wallet;
        string name;
        UserRole role;
        bool active;
    }

    address public admin;

    mapping(address => User) private users;

    event UserRegistered(address indexed wallet, string name, UserRole role);

    event UserDeactivated(address indexed wallet);

    event UserActivated(address indexed wallet);

    constructor(address adminAddress) {
        require(adminAddress != address(0), "Invalid admin");

        admin = adminAddress;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    function registerUser(string calldata name, UserRole role) external {
        require(bytes(name).length > 0, "Name cannot be empty");

        require(role != UserRole.NONE, "Invalid role");

        require(
            users[msg.sender].wallet == address(0),
            "User already registered"
        );

        users[msg.sender] = User({
            wallet: msg.sender,
            name: name,
            role: role,
            active: true
        });

        emit UserRegistered(msg.sender, name, role);
    }

    function getUser(address wallet) external view returns (User memory) {
        require(users[wallet].wallet != address(0), "User does not exist");

        return users[wallet];
    }

    function userExists(address wallet) external view returns (bool) {
        return users[wallet].wallet != address(0);
    }

    function isActive(address wallet) external view returns (bool) {
        return users[wallet].active;
    }

    function getUserRole(address wallet) external view returns (UserRole) {
        return users[wallet].role;
    }

    function deactivateUser(address wallet) external onlyAdmin {
        require(users[wallet].wallet != address(0), "User does not exist");

        users[wallet].active = false;

        emit UserDeactivated(wallet);
    }

    function activateUser(address wallet) external onlyAdmin {
        require(users[wallet].wallet != address(0), "User does not exist");

        users[wallet].active = true;

        emit UserActivated(wallet);
    }
}
