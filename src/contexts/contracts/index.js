
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";
// import { web3 } from '@coral-xyz/anchor'
import * as anchor from '@project-serum/anchor';
import { PublicKey, 
    SystemProgram, 
    Transaction
} from '@solana/web3.js';
import { NATIVE_MINT, 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID, 
    getMint, 
    getAssociatedTokenAddressSync
} from '@solana/spl-token';
import BN from 'bn.js';

import { PUMPFUN_PROGRAM_ID, 
    FEE_PRE_DIV 
} from './constants';
import { IDL } from './idl';
import * as Keys from './keys';
import { connection } from '../../engine/config';
import { send } from "@/engine/utils";
import { TOKEN_DECIMALS } from "@/engine/consts";
import { ChevronDoubleLeftIcon } from "@heroicons/react/20/solid";


const getProgram = (wallet) => {
    const provider = new anchor.AnchorProvider(
        connection, 
        wallet, 
        anchor.AnchorProvider.defaultOptions()
    );

    const program = new anchor.Program(IDL, PUMPFUN_PROGRAM_ID, provider);
    return program;
};


export const contract_getMainStateInfo = async (walletCtx) => {
    if (!walletCtx.connected) return null;

    const mainStateKey = await Keys.getMainStateKey();

    let mainStateInfo = await connection.getAccountInfo(mainStateKey);
    if (!mainStateInfo) return null;

    const program = getProgram(walletCtx);
    mainStateInfo = await program.account.mainState.fetch(mainStateKey);
    return mainStateInfo;
};

export const contract_isInitialized = async (walletCtx) => {
    const mainStateInfo = await contract_getMainStateInfo(walletCtx);
    return mainStateInfo?.initialized;
};

export const contract_initMainState = async (walletCtx) => {
    if (!walletCtx.connected)
        throw new WalletNotConnectedError();

    const program = getProgram(walletCtx);
    const mainStateKey = await Keys.getMainStateKey();

    const tx = new Transaction().add(
        await program.methods
            .initMainState()
            .accounts({
                mainState: mainStateKey, 
                owner: walletCtx.publicKey, 
                systemProgram: SystemProgram.programId
            })
            .instruction()
    );

    const txHash = await send(connection, walletCtx, tx);
    console.log('  initMainState txHash:', txHash);
};

export const contract_isPoolCreated = async (walletCtx, baseToken, quoteMint) => {
    if (!walletCtx.connected) return false;
    
    try {
        const baseMint = new PublicKey(baseToken);
        console.log("test", baseMint)
        const poolStateKey = await Keys.getPoolStateKey(baseMint, quoteMint);
        if (!poolStateKey) return false;

        const program = getProgram(walletCtx);
        const poolStateInfo = await program.account.poolState.fetch(poolStateKey);
        return poolStateInfo ? true : false;
    } catch (err) {
        console.error(err.message);
        return false;
    }
};

export const contract_createPoolTx = async (walletCtx, baseToken, baseAmount, quoteMint, quoteAmount) => {
    if (!walletCtx.connected)
        throw new WalletNotConnectedError();

    const creator = walletCtx.publicKey;
    const program = getProgram(walletCtx);
    const mainStateKey = await Keys.getMainStateKey();

    const baseMint = new PublicKey(baseToken);
    if (!baseMint)
        throw new Error("Invalid token");
    
    const baseMintDecimals = TOKEN_DECIMALS;
    const quoteMintDecimals = 9;
    const baseBalance = new BN(Math.floor(baseAmount * (10 ** baseMintDecimals)));
    const quoteBalance = new BN(Math.floor(quoteAmount * (10 ** quoteMintDecimals)));
    const creatorBaseAta = getAssociatedTokenAddressSync(baseMint, creator);
    const creatorQuoteAta = getAssociatedTokenAddressSync(quoteMint, creator);
    const poolStateKey = await Keys.getPoolStateKey(baseMint, quoteMint);
    const reserverBaseAta = getAssociatedTokenAddressSync(baseMint, poolStateKey, true);
    const reserverQuoteAta = getAssociatedTokenAddressSync(quoteMint, poolStateKey, true);
    const ix = await program.methods
        .createPool({ baseAmount: baseBalance, quoteAmount: quoteBalance })
        .accounts({
            creator, 
            mainState: mainStateKey, 
            poolState: poolStateKey, 
            baseMint, quoteMint, 
            creatorBaseAta, creatorQuoteAta, 
            reserverBaseAta, reserverQuoteAta, 
            systemProgram: SystemProgram.programId, 
            tokenProgram: TOKEN_PROGRAM_ID, 
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
        })
        // .preInstructions([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })]);
        .instruction();

    return ix;
};

export const contract_buyTx = async (walletCtx, baseToken, solAmount) => {
    if (!walletCtx.connected)
        throw new WalletNotConnectedError();

    const buyer = walletCtx.publicKey;
    const program = getProgram(walletCtx);
    const mainStateKey = await Keys.getMainStateKey();
    const mainStateInfo = await program.account.mainState.fetch(mainStateKey);
    if (!mainStateInfo) {
        throw new Error("Failed to fetch mainState!");
    }

    const baseMint = new PublicKey(baseToken);
    if (!baseMint) {
        throw new Error("Invalid token");
    }
    const quoteMint = new PublicKey(NATIVE_MINT);
    const poolStateKey = await Keys.getPoolStateKey(baseMint, quoteMint);
    
    const quoteMintDecimals = 9;
    const balance = new BN(Math.floor(solAmount * (10 ** quoteMintDecimals)));
    const buyerBaseAta = getAssociatedTokenAddressSync(baseMint, buyer);
    const buyerQuoteAta = getAssociatedTokenAddressSync(quoteMint, buyer);
    const reserverBaseAta = getAssociatedTokenAddressSync(baseMint, poolStateKey, true);
    const reserverQuoteAta = getAssociatedTokenAddressSync(quoteMint, poolStateKey, true);
    const feeQuoteAta = getAssociatedTokenAddressSync(quoteMint, mainStateInfo.feeRecipient);
    const ix = await program.methods
        .buy(balance)
        .accounts({
            baseMint, quoteMint, 
            buyer, buyerBaseAta, buyerQuoteAta, 
            mainState: mainStateKey, 
            poolState: poolStateKey, 
            feeRecipient: mainStateInfo.feeRecipient, feeQuoteAta, 
            reserverBaseAta, reserverQuoteAta, 
            systemProgram: SystemProgram.programId, 
            tokenProgram: TOKEN_PROGRAM_ID, 
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
        })
        // .preInstructions([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })]);
        .instruction();

    return ix;
};

export const contract_sellTx = async (walletCtx, baseToken, sellAmount) => {
    if (!walletCtx.connected)
        throw new WalletNotConnectedError();

    const seller = walletCtx.publicKey;
    const program = getProgram(walletCtx);
    const mainStateKey = await Keys.getMainStateKey();
    const mainStateInfo = await program.account.mainState.fetch(mainStateKey);
    if (!mainStateInfo) {
        throw new Error("Failed to fetch mainState!");
    }

    const baseMint = new PublicKey(baseToken);
    if (!baseMint) {
        throw new Error("Invalid token");
    }
    const quoteMint = new PublicKey(NATIVE_MINT);
    const poolStateKey = await Keys.getPoolStateKey(baseMint, quoteMint);
    
    const baseMintDecimals = TOKEN_DECIMALS;
    const sellBalance = new BN(Math.floor(sellAmount * (10 ** baseMintDecimals)));
    const sellerBaseAta = getAssociatedTokenAddressSync(baseMint, seller);
    const sellerQuoteAta = getAssociatedTokenAddressSync(quoteMint, seller);
    const reserverBaseAta = getAssociatedTokenAddressSync(baseMint, poolStateKey, true);
    const reserverQuoteAta = getAssociatedTokenAddressSync(quoteMint, poolStateKey, true);
    const feeQuoteAta = getAssociatedTokenAddressSync(quoteMint, mainStateInfo.feeRecipient);
    const ix = await program.methods
        .sell(sellBalance)
        .accounts({
            mainState: mainStateKey, 
            poolState: poolStateKey, 
            baseMint, quoteMint,
            seller, sellerBaseAta, sellerQuoteAta, 
            reserverBaseAta, reserverQuoteAta, 
            feeRecipient: mainStateInfo.feeRecipient, feeQuoteAta, 
            systemProgram: SystemProgram.programId, 
            tokenProgram: TOKEN_PROGRAM_ID, 
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
        })
        // .preInstructions([web3.ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 })]);
        .instruction();

    return ix;
};

export const contract_updateMainStateInfo = async (walletCtx, owner, feeRecipient, tradingFee) => {
    if (!walletCtx.connected) return false;

    let newOwner = null;
    let newFeeRecipient = null;
    let newTradingFee = null;
    
    const address1 = new PublicKey(owner);
    if (!address1) throw new Error('Invalid owner address!');
    newOwner = address1;
    
    const address2 = new PublicKey(feeRecipient);
    if (!address2) throw new Error('Invalid fee recipient address!');
    newFeeRecipient = address2;
    
    const tmpFee = Math.trunc(tradingFee * FEE_PRE_DIV);
    newTradingFee = new BN(tmpFee);

    const program = getProgram(walletCtx);
    const mainStateKey = await Keys.getMainStateKey();
    const tx = new Transaction().add(
        await program.methods.updateMainState({
            owner: newOwner, 
            feeRecipient: newFeeRecipient, 
            tradingFee: newTradingFee
        })
        .accounts({
            owner: walletCtx.publicKey, 
            mainState: mainStateKey
        })
        .instruction()
    );

    const txHash = await send(connection, walletCtx, tx);
    console.log('  updateMainState txHash:', txHash);
};

export const contract_isPoolComplete = async (walletCtx, baseToken, quoteMint) => {
    if (!walletCtx.connected) return false;

    try {
        const baseMint = new PublicKey(baseToken);
        const poolStateKey = await Keys.getPoolStateKey(baseMint, quoteMint);

        const poolStateAccount = await connection.getAccountInfo(poolStateKey);
        if (!poolStateAccount) {
            console.warn(`Pool state account does not exist: ${poolStateKey.toBase58()}`);
            return false;
        }

        const program = getProgram(walletCtx);
        const poolStateInfo = await program.account.poolState.fetch(poolStateKey);
        if (!poolStateInfo) return false;

        return poolStateInfo?.complete;
    } catch (err) {
        console.error("Error fetching pool state:", err);
        return false;
    }
};

