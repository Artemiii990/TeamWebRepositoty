// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CryptoPaymentGateway} from "../src/CryptoPaymentGateway.sol";
import {UserRegistry} from "../src/User.sol";

contract CryptoPaymentGatewayTest is Test {
    CryptoPaymentGateway public gateway;
    UserRegistry public registry;

    address public merchant = address(0x1);
    address public customer = address(0x2);
    address public anotherCustomer = address(0x3);
    address public stranger = address(0x4);

    uint256 public invoiceAmount = 1 ether;

    // Тестовый контракт должен уметь получать ETH.
    receive() external payable {}

    function setUp() public {
        // Создаем реестр пользователей.
        registry = new UserRegistry(address(this));

        // Создаем платежный шлюз.
        gateway = new CryptoPaymentGateway(address(registry));

        // Регистрируем merchant.
        vm.prank(merchant);

        registry.registerUser("Merchant", UserRegistry.UserRole.MERCHANT);

        // Регистрируем customer.
        vm.prank(customer);

        registry.registerUser("Customer", UserRegistry.UserRole.CUSTOMER);

        // Регистрируем второго customer.
        vm.prank(anotherCustomer);

        registry.registerUser(
            "Another Customer",
            UserRegistry.UserRole.CUSTOMER
        );
    }

    // ============================================================
    // USER REGISTRY
    // ============================================================

    function testMerchantIsRegisteredCorrectly() public {
        UserRegistry.User memory user = registry.getUser(merchant);

        assertEq(user.wallet, merchant);

        assertEq(uint256(user.role), uint256(UserRegistry.UserRole.MERCHANT));

        assertTrue(user.active);
        assertEq(user.name, "Merchant");
    }

    function testCustomerIsRegisteredCorrectly() public {
        UserRegistry.User memory user = registry.getUser(customer);

        assertEq(user.wallet, customer);

        assertEq(uint256(user.role), uint256(UserRegistry.UserRole.CUSTOMER));

        assertTrue(user.active);
        assertEq(user.name, "Customer");
    }

    function testCannotRegisterUserTwice() public {
        vm.prank(merchant);

        vm.expectRevert("User already registered");

        registry.registerUser(
            "Another Merchant",
            UserRegistry.UserRole.MERCHANT
        );
    }

    // ============================================================
    // INVOICE CREATION
    // ============================================================

    function testCreateInvoice() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        assertEq(invoiceId, 1);

        CryptoPaymentGateway.Invoice memory invoice = gateway.getInvoice(
            invoiceId
        );

        assertEq(invoice.invoiceId, 1);

        assertEq(invoice.merchant, merchant);

        assertEq(invoice.customer, address(0));

        assertEq(invoice.amount, invoiceAmount);

        assertEq(invoice.description, "Website development");

        assertEq(
            uint256(invoice.status),
            uint256(CryptoPaymentGateway.InvoiceStatus.WAITING_PAYMENT)
        );
    }

    function testOnlyMerchantCanCreateInvoice() public {
        vm.prank(customer);

        vm.expectRevert("User is not merchant");

        gateway.createInvoice(invoiceAmount, "Test invoice");
    }

    function testCannotCreateInvoiceWithZeroAmount() public {
        vm.prank(merchant);

        vm.expectRevert("Amount must be greater than zero");

        gateway.createInvoice(0, "Test invoice");
    }

    function testCannotCreateInvoiceWithEmptyDescription() public {
        vm.prank(merchant);

        vm.expectRevert("Description cannot be empty");

        gateway.createInvoice(invoiceAmount, "");
    }

    // ============================================================
    // INVOICE CREATED EVENT
    // ============================================================

    function testInvoiceCreatedEvent() public {
        vm.prank(merchant);

        vm.expectEmit(true, true, false, true);

        emit InvoiceCreated(
            1,
            merchant,
            invoiceAmount,
            "Website development",
            block.timestamp
        );

        gateway.createInvoice(invoiceAmount, "Website development");
    }

    event InvoiceCreated(
        uint256 indexed invoiceId,
        address indexed merchant,
        uint256 amount,
        string description,
        uint256 timestamp
    );

    // ============================================================
    // PAYMENT
    // ============================================================

    function testPayInvoice() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        uint256 merchantBalanceBefore = merchant.balance;

        vm.deal(customer, invoiceAmount);

        vm.prank(customer);

        gateway.payInvoice{value: invoiceAmount}(invoiceId);

        CryptoPaymentGateway.Invoice memory invoice = gateway.getInvoice(
            invoiceId
        );

        assertEq(invoice.customer, customer);

        assertEq(
            uint256(invoice.status),
            uint256(CryptoPaymentGateway.InvoiceStatus.PAID)
        );

        assertEq(merchant.balance, merchantBalanceBefore + invoiceAmount);
    }

    function testOnlyCustomerCanPayInvoice() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        vm.deal(stranger, invoiceAmount);

        vm.prank(stranger);

        vm.expectRevert("User is not registered");

        gateway.payInvoice{value: invoiceAmount}(invoiceId);
    }

    function testMerchantCannotPayInvoice() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        vm.deal(merchant, invoiceAmount);

        vm.prank(merchant);

        vm.expectRevert("User is not customer");

        gateway.payInvoice{value: invoiceAmount}(invoiceId);
    }

    function testPayInvoiceWithIncorrectAmount() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        vm.deal(customer, 0.5 ether);

        vm.prank(customer);

        vm.expectRevert("Incorrect payment amount");

        gateway.payInvoice{value: 0.5 ether}(invoiceId);
    }

    function testCannotPayInvoiceTwice() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        vm.deal(customer, invoiceAmount);

        vm.prank(customer);

        gateway.payInvoice{value: invoiceAmount}(invoiceId);

        vm.deal(anotherCustomer, invoiceAmount);

        vm.prank(anotherCustomer);

        vm.expectRevert("Invoice is not waiting for payment");

        gateway.payInvoice{value: invoiceAmount}(invoiceId);
    }

    function testCannotPayNonExistentInvoice() public {
        vm.deal(customer, invoiceAmount);

        vm.prank(customer);

        vm.expectRevert("Invoice does not exist");

        gateway.payInvoice{value: invoiceAmount}(999);
    }

    // ============================================================
    // PAYMENT EVENT
    // ============================================================

    function testInvoicePaidEvent() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        vm.deal(customer, invoiceAmount);

        vm.prank(customer);

        vm.expectEmit(true, true, false, true);

        emit InvoicePaid(invoiceId, customer, invoiceAmount);

        gateway.payInvoice{value: invoiceAmount}(invoiceId);
    }

    event InvoicePaid(
        uint256 indexed invoiceId,
        address indexed customer,
        uint256 amount
    );

    // ============================================================
    // ADMIN
    // ============================================================

    function testOwnerIsSetCorrectly() public view {
        assertEq(gateway.admin(), address(this));
    }

    function testAdminCanPauseContract() public {
        gateway.pause();

        assertTrue(gateway.paused());
    }

    function testAdminCanUnpauseContract() public {
        gateway.pause();

        gateway.unpause();

        assertFalse(gateway.paused());
    }

    function testNonAdminCannotPauseContract() public {
        vm.prank(stranger);

        vm.expectRevert("Not admin");

        gateway.pause();
    }

    function testCannotCreateInvoiceWhenPaused() public {
        gateway.pause();

        vm.prank(merchant);

        vm.expectRevert("Contract is paused");

        gateway.createInvoice(invoiceAmount, "Website development");
    }

    function testCannotPayInvoiceWhenPaused() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        gateway.pause();

        vm.deal(customer, invoiceAmount);

        vm.prank(customer);

        vm.expectRevert("Contract is paused");

        gateway.payInvoice{value: invoiceAmount}(invoiceId);
    }

    // ============================================================
    // ADMIN - INVOICE STATUS
    // ============================================================

    function testAdminCanChangeInvoiceStatus() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        gateway.changeInvoiceStatus(
            invoiceId,
            CryptoPaymentGateway.InvoiceStatus.CONFIRMED
        );

        CryptoPaymentGateway.Invoice memory invoice = gateway.getInvoice(
            invoiceId
        );

        assertEq(
            uint256(invoice.status),
            uint256(CryptoPaymentGateway.InvoiceStatus.CONFIRMED)
        );
    }

    function testNonAdminCannotChangeInvoiceStatus() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        vm.prank(stranger);

        vm.expectRevert("Not admin");

        gateway.changeInvoiceStatus(
            invoiceId,
            CryptoPaymentGateway.InvoiceStatus.CONFIRMED
        );
    }

    function testCannotChangeStatusOfNonExistentInvoice() public {
        vm.expectRevert("Invoice does not exist");

        gateway.changeInvoiceStatus(
            999,
            CryptoPaymentGateway.InvoiceStatus.CONFIRMED
        );
    }

    // ============================================================
    // ADMIN - EMERGENCY WITHDRAW
    // ============================================================

    function testEmergencyWithdraw() public {
        vm.deal(address(gateway), 2 ether);

        uint256 adminBalanceBefore = address(this).balance;

        gateway.emergencyWithdraw(1 ether);

        assertEq(address(gateway).balance, 1 ether);

        assertEq(address(this).balance, adminBalanceBefore + 1 ether);
    }

    function testNonAdminCannotEmergencyWithdraw() public {
        vm.deal(address(gateway), 2 ether);

        vm.prank(stranger);

        vm.expectRevert("Not admin");

        gateway.emergencyWithdraw(1 ether);
    }

    function testCannotWithdrawMoreThanBalance() public {
        vm.deal(address(gateway), 1 ether);

        vm.expectRevert("Insufficient contract balance");

        gateway.emergencyWithdraw(2 ether);
    }

    // ============================================================
    // USER ACTIVATION / DEACTIVATION
    // ============================================================

    function testAdminCanDeactivateUser() public {
        registry.deactivateUser(merchant);

        assertFalse(registry.isActive(merchant));
    }

    function testAdminCanActivateUser() public {
        registry.deactivateUser(merchant);

        registry.activateUser(merchant);

        assertTrue(registry.isActive(merchant));
    }

    function testDeactivatedMerchantCannotCreateInvoice() public {
        registry.deactivateUser(merchant);

        vm.prank(merchant);

        vm.expectRevert("User is inactive");

        gateway.createInvoice(invoiceAmount, "Website development");
    }

    function testDeactivatedCustomerCannotPayInvoice() public {
        vm.prank(merchant);

        uint256 invoiceId = gateway.createInvoice(
            invoiceAmount,
            "Website development"
        );

        registry.deactivateUser(customer);

        vm.deal(customer, invoiceAmount);

        vm.prank(customer);

        vm.expectRevert("User is inactive");

        gateway.payInvoice{value: invoiceAmount}(invoiceId);
    }

    // ============================================================
    // BALANCE
    // ============================================================

    function testGetContractBalance() public view {
        assertEq(gateway.getContractBalance(), 0);
    }

    function testGetNextInvoiceId() public view {
        assertEq(gateway.getNextInvoiceId(), 1);
    }
}
