// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./Admin.sol";
import "./User.sol";

contract CryptoPaymentGateway is Admin {
    enum InvoiceStatus {
        WAITING_PAYMENT,
        PAID,
        CONFIRMED
    }

    struct Invoice {
        uint256 invoiceId;
        address payable merchant;
        address customer;
        uint256 amount;
        string description;
        uint256 timestamp;
        InvoiceStatus status;
    }

    uint256 private nextInvoiceId = 1;

    mapping(uint256 => Invoice) private invoices;

    bool public paused;

    UserRegistry public userRegistry;

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 amount,
        string description,
        uint256 timestamp
    );

    event InvoicePaid(
        uint256 indexed invoiceId,
        address indexed customer,
        uint256 amount
    );

    event InvoiceStatusChanged(
        uint256 indexed invoiceId,
        InvoiceStatus newStatus
    );

    event ContractPaused(address indexed admin);

    event ContractUnpaused(address indexed admin);

    event EmergencyWithdrawal(address indexed admin, uint256 amount);

    constructor(address userRegistryAddress) {
        require(userRegistryAddress != address(0), "Invalid registry");

        userRegistry = UserRegistry(userRegistryAddress);
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyMerchant() {
        require(userRegistry.userExists(msg.sender), "User is not registered");

        require(
            userRegistry.getUserRole(msg.sender) ==
                UserRegistry.UserRole.MERCHANT,
            "User is not merchant"
        );

        require(userRegistry.isActive(msg.sender), "User is inactive");

        _;
    }

    modifier onlyCustomer() {
        require(userRegistry.userExists(msg.sender), "User is not registered");

        require(
            userRegistry.getUserRole(msg.sender) ==
                UserRegistry.UserRole.CUSTOMER,
            "User is not customer"
        );

        require(userRegistry.isActive(msg.sender), "User is inactive");

        _;
    }

    // =========================
    // Admin
    // =========================

    function pause() external onlyAdmin {
        paused = true;

        emit ContractPaused(msg.sender);
    }

    function unpause() external onlyAdmin {
        paused = false;

        emit ContractUnpaused(msg.sender);
    }

    function changeInvoiceStatus(
        uint256 invoiceId,
        InvoiceStatus newStatus
    ) external onlyAdmin {
        Invoice storage invoice = invoices[invoiceId];

        require(invoice.invoiceId != 0, "Invoice does not exist");

        invoice.status = newStatus;

        emit InvoiceStatusChanged(invoiceId, newStatus);
    }

    function emergencyWithdraw(uint256 amount) external onlyAdmin {
        require(
            amount <= address(this).balance,
            "Insufficient contract balance"
        );

        (bool success, ) = payable(admin).call{value: amount}("");

        require(success, "Withdrawal failed");

        emit EmergencyWithdrawal(admin, amount);
    }

    // =========================
    // Merchant
    // =========================

    function createInvoice(
        uint256 amount,
        string calldata description
    ) external whenNotPaused onlyMerchant returns (uint256 invoiceId) {
        require(amount > 0, "Amount must be greater than zero");

        require(bytes(description).length > 0, "Description cannot be empty");

        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = Invoice({
            invoiceId: invoiceId,
            merchant: payable(msg.sender),
            customer: address(0),
            amount: amount,
            description: description,
            timestamp: block.timestamp,
            status: InvoiceStatus.WAITING_PAYMENT
        });

        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            amount,
            description,
            block.timestamp
        );
    }

    // =========================
    // Customer
    // =========================

    function payInvoice(
        uint256 invoiceId
    ) external payable whenNotPaused onlyCustomer {
        Invoice storage invoice = invoices[invoiceId];

        require(invoice.invoiceId != 0, "Invoice does not exist");

        require(
            invoice.status == InvoiceStatus.WAITING_PAYMENT,
            "Invoice is not waiting for payment"
        );

        require(msg.value == invoice.amount, "Incorrect payment amount");

        invoice.customer = msg.sender;

        invoice.status = InvoiceStatus.PAID;

        (bool success, ) = invoice.merchant.call{value: msg.value}("");

        require(success, "Payment transfer failed");

        emit InvoicePaid(invoiceId, msg.sender, msg.value);
    }

    // =========================
    // View
    // =========================

    function getInvoice(
        uint256 invoiceId
    ) external view returns (Invoice memory) {
        require(invoices[invoiceId].invoiceId != 0, "Invoice does not exist");

        return invoices[invoiceId];
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getNextInvoiceId() external view returns (uint256) {
        return nextInvoiceId;
    }
}
