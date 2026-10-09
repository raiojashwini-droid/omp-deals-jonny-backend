const prisma = require('../config/prisma');

class DeskingService {
  calculateDeal(data) {
    const {
      sellingPrice,
      downPayment = 0,
      tradeAllowance = 0,
      tradePayoff = 0,
      termMonths = 60,
      apr = 6.99,
      docFee = 899,
      taxRatePercent = 6.0
    } = data;

    if (!sellingPrice || sellingPrice <= 0) {
      throw { status: 400, message: 'Valid sellingPrice is required' };
    }

    if (![24, 36, 48, 60, 72, 84].includes(termMonths)) {
      throw { status: 400, message: 'Invalid termMonths. Allowed values: 24, 36, 48, 60, 72, 84.' };
    }

    // 1. Calculate Net Trade
    const netTrade = Math.max(0, tradeAllowance - tradePayoff);

    // 2. Calculate Taxable Amount (In many states, trade allowance reduces taxable amount)
    // Assuming trade allowance reduces taxable amount (Florida rules standard)
    const taxableAmount = Math.max(0, sellingPrice - tradeAllowance);

    // 3. Calculate Sales Tax
    const salesTax = taxableAmount * (taxRatePercent / 100);

    // 4. Calculate Amount Financed
    // Note: Net trade is subtracted, payoff is essentially rolled in if trade is underwater.
    // Actually, net trade = allowance - payoff. If negative, it means they owe more than it's worth (negative equity).
    // Amount Financed = Price + DocFee + Tax + (Payoff - Allowance) - DownPayment
    // Same as: Price + DocFee + Tax - NetTrade - DownPayment
    const amountFinanced = sellingPrice + docFee + salesTax - (tradeAllowance - tradePayoff) - downPayment;

    if (amountFinanced <= 0) {
      return {
        amountFinanced: 0,
        monthlyPayment: 0,
        totalInterest: 0,
        totalPayments: 0,
        dealerReserve: 0,
        docFee,
        salesTax: Number(salesTax.toFixed(2))
      };
    }

    // 5. Calculate Monthly Payment (Standard Amortization Formula)
    const monthlyRate = apr / 100 / 12;
    let monthlyPayment = 0;
    let totalInterest = 0;

    if (apr > 0) {
      monthlyPayment = (amountFinanced * (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) / 
                       (Math.pow(1 + monthlyRate, termMonths) - 1);
      totalInterest = (monthlyPayment * termMonths) - amountFinanced;
    } else {
      monthlyPayment = amountFinanced / termMonths;
    }

    // 6. Calculate Dealer Reserve (Simple estimated backend gross profit on rate markup - demo formula)
    // Assume dealer gets 1.5% flat participation on amount financed if rate > 0
    const dealerReserve = apr > 0 ? amountFinanced * 0.015 : 0;

    // 7. Option 2: Cash Purchase
    const totalFees = docFee + 250; // registration & titling
    const cashOutTheDoor = sellingPrice + salesTax + totalFees - tradeAllowance + tradePayoff;

    // 8. Option 3: BHPH Weekly
    const bhphInterest = 14.99 / 100 / 52;
    const bhphWeeks = (termMonths / 12) * 52;
    let bhphWeeklyPayment = 0;
    if (bhphInterest > 0) {
      bhphWeeklyPayment = (amountFinanced * (bhphInterest * Math.pow(1 + bhphInterest, bhphWeeks))) / 
                          (Math.pow(1 + bhphInterest, bhphWeeks) - 1);
    } else {
      bhphWeeklyPayment = amountFinanced / bhphWeeks;
    }

    // 9. Option 4: Lease Option
    const leaseMonthlyPayment = monthlyPayment * 0.74;
    const residualValue = sellingPrice * 0.55;

    return {
      amountFinanced: Number(amountFinanced.toFixed(2)),
      docFee,
      salesTax: Number(salesTax.toFixed(2)),
      netTrade: Number(netTrade.toFixed(2)),
      
      bankFinancing: {
        monthlyPayment: Number(monthlyPayment.toFixed(2)),
        totalInterest: Number(totalInterest.toFixed(2)),
        totalPayments: Number((monthlyPayment * termMonths).toFixed(2)),
        dealerReserve: Number(dealerReserve.toFixed(2))
      },
      cashPurchase: {
        cashOutTheDoor: Number(cashOutTheDoor.toFixed(2))
      },
      bhph: {
        weeklyPayment: Number(bhphWeeklyPayment.toFixed(2))
      },
      lease: {
        monthlyPayment: Number(leaseMonthlyPayment.toFixed(2)),
        residualValue: Number(residualValue.toFixed(2))
      }
    };
  }

  calculateReverseDeal(data) {
    const {
      targetMonthlyPayment,
      downPayment = 0,
      tradeAllowance = 0,
      tradePayoff = 0,
      termMonths = 60,
      apr = 6.99,
      docFee = 899,
      taxRatePercent = 6.0
    } = data;

    if (!targetMonthlyPayment || targetMonthlyPayment <= 0) {
      throw { status: 400, message: 'Valid targetMonthlyPayment is required' };
    }

    if (![24, 36, 48, 60, 72, 84].includes(termMonths)) {
      throw { status: 400, message: 'Invalid termMonths. Allowed values: 24, 36, 48, 60, 72, 84.' };
    }

    // 1. Calculate max amount financed based on target payment
    const monthlyRate = apr / 100 / 12;
    let maxAmountFinanced = 0;
    
    if (apr > 0) {
      // P = (PMT * (1 - (1 + r)^-n)) / r
      maxAmountFinanced = (targetMonthlyPayment * (1 - Math.pow(1 + monthlyRate, -termMonths))) / monthlyRate;
    } else {
      maxAmountFinanced = targetMonthlyPayment * termMonths;
    }

    // 2. Reverse calculate selling price
    // AmountFinanced = Price + DocFee + Tax - NetTrade - DownPayment
    // TaxableAmount = Price - TradeAllowance
    // Tax = TaxableAmount * (TaxRate / 100) = (Price - TradeAllowance) * (TaxRate / 100)
    // AmountFinanced = Price + DocFee + (Price - TradeAllowance) * (TaxRate / 100) - (TradeAllowance - TradePayoff) - DownPayment
    // AmountFinanced = Price * (1 + TaxRate/100) - TradeAllowance * (TaxRate/100) + DocFee - TradeAllowance + TradePayoff - DownPayment
    // AmountFinanced = Price * (1 + TaxRate/100) + DocFee - TradeAllowance * (1 + TaxRate/100) + TradePayoff - DownPayment
    
    // Price * (1 + TaxRate/100) = AmountFinanced - DocFee + TradeAllowance * (1 + TaxRate/100) - TradePayoff + DownPayment
    // Price = (AmountFinanced - DocFee + TradeAllowance * (1 + TaxRate/100) - TradePayoff + DownPayment) / (1 + TaxRate/100)
    
    const taxMultiplier = 1 + (taxRatePercent / 100);
    const maxSellingPrice = (maxAmountFinanced - docFee + (tradeAllowance * taxMultiplier) - tradePayoff + downPayment) / taxMultiplier;

    return {
      maxSellingPrice: Number(maxSellingPrice.toFixed(2)),
      maxAmountFinanced: Number(maxAmountFinanced.toFixed(2)),
      targetMonthlyPayment,
      termMonths,
      apr,
      downPayment,
      netTrade: Number((tradeAllowance - tradePayoff).toFixed(2))
    };
  }

  async getDeal(dealId) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        store: true,
        vehicle: true,
        salesRep: true
      }
    });

    if (!deal) {
      throw { status: 404, message: 'Deal not found' };
    }

    return deal;
  }

  async signDeal(dealId) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw { status: 404, message: 'Deal not found' };

    const updated = await prisma.deal.update({
      where: { id: dealId },
      data: {
        esign_status: 'SIGNED',
        signed_at: new Date()
      }
    });

    return updated;
  }
}

module.exports = new DeskingService();
