// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CryptoPaymentGateway {
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
        uint256 timestamp;
        InvoiceStatus status;
    }

    uint256 private nextInvoiceId = 1;

    mapping(uint256 => Invoice) private invoices;

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 amount,
        uint256 timestamp
    );

    event InvoicePaid(
        uint256 indexed invoiceId,
        address indexed customer,
        uint256 amount
    );

    function createInvoice(uint256 amount)
        external
        returns (uint256 invoiceId)
    {
        require(amount > 0, "Amount must be greater than zero");

        invoiceId = nextInvoiceId++;

        invoices[invoiceId] = Invoice({
            invoiceId: invoiceId,
            merchant: payable(msg.sender),
            customer: address(0),
            amount: amount,
            timestamp: block.timestamp,
            status: InvoiceStatus.WAITING_PAYMENT
        });

        emit InvoiceCreated(
            invoiceId,
            msg.sender,
            amount,
            block.timestamp
        );
    }

    function payInvoice(uint256 invoiceId) external payable {
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

        emit InvoicePaid(
            invoiceId,
            msg.sender,
            msg.value
        );
    }

    function getInvoice(uint256 invoiceId)
        external
        view
        returns (Invoice memory)
    {
        require(
            invoices[invoiceId].invoiceId != 0,
            "Invoice does not exist"
        );

        return invoices[invoiceId];
    }
}