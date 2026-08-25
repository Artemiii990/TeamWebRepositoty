// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CryptoPaymentGateway} from "../src/CryptoPaymentGateway.sol";

contract CryptoPaymentGatewayTest is Test {
    CryptoPaymentGateway gateway;

    address merchant = address(1);

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

    function setUp() public {
        gateway = new CryptoPaymentGateway();
    }

    // =========================================================
    // Тесты создания Invoice
    // =========================================================

    function testCreateInvoice() public {
        uint256 amount = 0.05 ether;
        string memory description = "Laptop";

        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(amount, description);

        assertEq(invoiceId, 1);

        CryptoPaymentGateway.Invoice memory invoice = gateway.getInvoice(
            invoiceId
        );

        assertEq(invoice.invoiceId, 1);
        assertEq(invoice.merchant, merchant);
        assertEq(invoice.customer, address(0));
        assertEq(invoice.amount, amount);
        assertEq(invoice.description, description);
        assertEq(invoice.timestamp, block.timestamp);

        assertEq(
            uint256(invoice.status),
            uint256(CryptoPaymentGateway.InvoiceStatus.WAITING_PAYMENT)
        );
    }

    function testCreateInvoiceWithDescription() public {
        uint256 amount = 0.05 ether;
        string memory description = "Gaming Laptop";

        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(amount, description);

        CryptoPaymentGateway.Invoice memory invoice = gateway.getInvoice(
            invoiceId
        );

        assertEq(invoice.description, description);
    }

    function testCannotCreateInvoiceWithZeroAmount() public {
        vm.prank(merchant);

        vm.expectRevert("Amount must be greater than zero");

        gateway.createInvoice(0, "Laptop");
    }

    function testCannotCreateInvoiceWithEmptyDescription() public {
        vm.prank(merchant);

        vm.expectRevert("Description cannot be empty");

        gateway.createInvoice(0.05 ether, "");
    }

    // =========================================================
    // Тесты оплаты
    // =========================================================

    function testPayInvoice() public {
        uint256 amount = 0.05 ether;
        string memory description = "Laptop";

        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(amount, description);

        address customer = address(2);

        vm.deal(customer, 1 ether);

        vm.prank(customer);

        gateway.payInvoice{value: amount}(invoiceId);

        CryptoPaymentGateway.Invoice memory invoice = gateway.getInvoice(
            invoiceId
        );

        assertEq(invoice.customer, customer);
        assertEq(invoice.amount, amount);
        assertEq(invoice.description, description);

        assertEq(
            uint256(invoice.status),
            uint256(CryptoPaymentGateway.InvoiceStatus.PAID)
        );
    }

    function testPayInvoiceWithIncorrectAmount() public {
        uint256 amount = 0.05 ether;

        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(amount, "Laptop");

        address customer = address(2);

        vm.deal(customer, 1 ether);

        vm.prank(customer);

        vm.expectRevert("Incorrect payment amount");

        gateway.payInvoice{value: 0.04 ether}(invoiceId);
    }

    function testCannotPayInvoiceTwice() public {
        uint256 amount = 0.05 ether;

        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(amount, "Laptop");

        address customer = address(2);

        vm.deal(customer, 1 ether);

        vm.prank(customer);

        gateway.payInvoice{value: amount}(invoiceId);

        vm.prank(customer);

        vm.expectRevert("Invoice is not waiting for payment");

        gateway.payInvoice{value: amount}(invoiceId);
    }

    function testCannotPayNonExistentInvoice() public {
        address customer = address(2);

        vm.deal(customer, 1 ether);

        vm.prank(customer);

        vm.expectRevert("Invoice does not exist");

        gateway.payInvoice{value: 0.05 ether}(999);
    }

    // =========================================================
    // Тесты Events
    // =========================================================

    function testInvoiceCreatedEvent() public {
        uint256 amount = 0.05 ether;
        string memory description = "Laptop";

        vm.warp(1000);

        vm.expectEmit(true, true, false, true);

        emit InvoiceCreated(1, merchant, amount, description, 1000);

        vm.prank(merchant);

        gateway.createInvoice(amount, description);
    }

    function testInvoicePaidEvent() public {
        uint256 amount = 0.05 ether;

        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(amount, "Laptop");

        address customer = address(2);

        vm.deal(customer, 1 ether);

        vm.expectEmit(true, true, false, true);

        emit InvoicePaid(invoiceId, customer, amount);

        vm.prank(customer);

        gateway.payInvoice{value: amount}(invoiceId);
    }

    // =========================================================
    // Тест getInvoice
    // =========================================================

    function testGetInvoice() public {
        uint256 amount = 0.05 ether;
        string memory description = "Laptop";

        vm.warp(1000);

        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(amount, description);

        CryptoPaymentGateway.Invoice memory invoice = gateway.getInvoice(
            invoiceId
        );

        assertEq(invoice.invoiceId, 1);
        assertEq(invoice.merchant, merchant);
        assertEq(invoice.customer, address(0));
        assertEq(invoice.amount, amount);
        assertEq(invoice.description, description);
        assertEq(invoice.timestamp, 1000);

        assertEq(
            uint256(invoice.status),
            uint256(CryptoPaymentGateway.InvoiceStatus.WAITING_PAYMENT)
        );
    }

    // =========================================================
    // Тесты администратора
    // =========================================================

    function testOwnerIsSetCorrectly() public {
        assertEq(gateway.owner(), address(this));
    }

    function testOwnerCanPause() public {
        gateway.pause();

        assertTrue(gateway.paused());
    }

    function testNonOwnerCannotPause() public {
        address user = address(3);

        vm.prank(user);

        vm.expectRevert("Not owner");

        gateway.pause();
    }

    function testOwnerCanUnpause() public {
        gateway.pause();

        assertTrue(gateway.paused());

        gateway.unpause();

        assertFalse(gateway.paused());
    }

    function testCannotCreateInvoiceWhenPaused() public {
        gateway.pause();

        vm.prank(merchant);

        vm.expectRevert("Contract is paused");

        gateway.createInvoice(0.05 ether, "Laptop");
    }

    function testCannotPayInvoiceWhenPaused() public {
        uint256 amount = 0.05 ether;

        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(amount, "Laptop");

        address customer = address(2);

        vm.deal(customer, 1 ether);

        gateway.pause();

        vm.prank(customer);

        vm.expectRevert("Contract is paused");

        gateway.payInvoice{value: amount}(invoiceId);
    }
}
