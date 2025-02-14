"use client"

import Link from 'next/link'
import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Progress } from 'flowbite-react';
import { toast } from "react-toastify"
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react'
import { NATIVE_MINT } from '@solana/spl-token'
import { useContract } from '@/contexts/ContractContext'
import { getRealTokenReserves, getTokenInfoByAddress, calculateVirtualLiquidity } from '../../utils/getTokenInfo'
import { formatAddress } from '@/utils/format'
import { tradeToken } from '@/utils/trade'
import { getTokenBalance } from '@/utils/getTokenBalance'
import { getTokenDecimals } from '@/utils/getTokenDecimals'
import Chart from '@/components/tradingview'

const ProgressTheme = {
  base: 'bg-[#141414] rounded-full',
  size: {
    'sm': 'h-2'
  },
  color: {
    'white': 'bg-white'
  }
}

export default function TokenPage() {
  const { query } = useRouter();
  const { addr } = query;
  const { publicKey, connected } = useWallet();
  const [walletBalance, setWalletBalance] = useState(0);
  const walletCtx = useWallet();
  const { isPoolComplete: isPoolCompleted } = useContract();
  const [currentMode, setCurrentMode] = useState('buy')
  const [amount, setAmount] = useState('')
  const [tokenInfo, setTokenInfo] = useState(null)
  const [isPoolComplete, setIsPoolComplete] = useState(false)
  const [txPending, setTxPending] = useState(false);
  const [bondingCurveProgress, setBondingCurveProgress] = useState(0);
  const [tokensAvailableForSale, setTokensAvailableForSale] = useState(0);
  const [virtualLiquidity, setVirtualLiquidity] = useState(0);
  const [tokenDecimal, setTokenDecimal] = useState(0);
   
  const checkCompleted = useCallback(async () => {
    if (walletCtx.publicKey !== null && addr !== undefined) {
      const result = await isPoolCompleted(addr, NATIVE_MINT);
      setIsPoolComplete(result);
    }
  }, [walletCtx.publicKey, addr, isPoolCompleted]);

  useEffect(() => {
    if (walletCtx.publicKey !== null) {
      checkCompleted();
    }
  }, [walletCtx, checkCompleted]);

  
  useEffect(() => {
    if (walletCtx.publicKey !== null) {
      checkCompleted();
    }
  }, [walletCtx.publicKey, checkCompleted]);
  
  const getTokenInfo = useCallback(async () => {
    if (!addr) return; // Avoid running with an undefined address
    const result = await getTokenInfoByAddress(addr);
    setTokenInfo(result);
  }, [addr]);
  
  useEffect(() => {
    if (addr !== undefined) {
      getTokenInfo();
    }
  }, [addr, getTokenInfo]);

  useEffect(() => {
    if (addr !== undefined) {
      getTokenInfo();
    }
  }, [addr, getTokenInfo]);

  const getPoolCompleted = async (tokenInfo) => {
    const result = await tokenInfo.complete
    return result;
  }

  const calculateBondingCurveProgress = async (tokenInfo) => { // Mark function as async
    if (!tokenInfo || !tokenInfo.total_supply || !tokenInfo.virtual_token_reserves) {
      return 0; // Default if data is missing
    }
    const totalSupply = tokenInfo.total_supply; // 1B tokens
    const reservedTokens = tokenInfo.virtual_token_reserves; // 206.9M reserved
    const initialRealTokenReserves = totalSupply - reservedTokens; // 793.1M
    try {
      const realTokenReserves = await getRealTokenReserves(tokenInfo?.associated_bonding_curve);

      if (realTokenReserves < reservedTokens) return 0; // If less than reserved, progress is 0%

      const leftTokens = realTokenReserves - reservedTokens;
      const bondingCurveProgress = 100 - ((leftTokens * 100) / initialRealTokenReserves);

      return bondingCurveProgress.toFixed(2); // Return percentage with 2 decimal places
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return null;
    }
  };

  const calculateTokensAvailableForSale = async (tokenInfo) => {
    if (!tokenInfo || !tokenInfo.virtual_token_reserves || !tokenInfo.associated_bonding_curve) {
      return 0;
    }

    const reservedTokens = tokenInfo.virtual_token_reserves;
    try {
      const realTokenReserves = await getRealTokenReserves(tokenInfo?.associated_bonding_curve);

      const tokensAvailableForSale = Math.max(realTokenReserves - reservedTokens, 0);

      return tokensAvailableForSale.toFixed(0);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      return null;
    }
  };

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (connected && publicKey) {
        const tokenBalance = await getTokenBalance(publicKey.toString(), tokenInfo?.mint);
        const tokenDecimal = await getTokenDecimals(tokenInfo?.mint);
        setWalletBalance(tokenBalance);
        setTokenDecimal(tokenDecimal);
      }
    };

    fetchTokenInfo();
  }, [connected, publicKey, tokenInfo]);

  useEffect(() => {
    const fetchData = async () => {
      if (tokenInfo) {
        const progress = await calculateBondingCurveProgress(tokenInfo);
        setBondingCurveProgress(progress || 0); // Ensure default value on failure

        const availableTokens = await calculateTokensAvailableForSale(tokenInfo);
        setTokensAvailableForSale(availableTokens || 0);

        // Use imported calculateVirtualLiquidity function
        const virtualLiquidity = await calculateVirtualLiquidity(tokenInfo);
        setVirtualLiquidity(virtualLiquidity || 0);

        const isPoolCompleted = await getPoolCompleted(tokenInfo);
        setIsPoolComplete(isPoolCompleted);
      }
    };

    fetchData();
  }, [tokenInfo]);

  const onChangeAmount = (e) => {
    if (Number(e.target.value) < 0) return;
    setAmount(e.target.value);
  };

  const onTrade = async () => {
    if (!connected) {
      toast.error("❌ Wallet not connected!");
      return;
    }

    if (amount === "") {
      toast.warning("⚠️ Please enter an amount!");
      return;
    }

    const isBuying = currentMode === "buy";
    const tradeAmount = parseFloat(amount);
    const poolType = isPoolComplete ? "raydium" : "pump";

    if (isBuying && tokenInfo?.solBalance < tradeAmount) {
      toast.error("❌ Insufficient SOL balance!");
      return;
    } else if (!isBuying && tokenInfo?.tokenBalance < tradeAmount) {
      toast.error("❌ Insufficient token balance!");
      return;
    }

    // setIsTradeDialogOpen(false);
    setTxPending(true);

    try {
      const txid = await tradeToken(walletCtx, currentMode, tokenInfo.mint, tradeAmount, isBuying, poolType);

      if (txid) {
        toast.success(
          <div>
            🎉 <strong>Trade Successful!</strong> 🚀
            <br />
            Track your transaction here:
            <a
              href={`https://solscan.io/tx/${txid}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4CAF50", fontWeight: "bold" }}
            >
              View on Solscan 🔗
            </a>
          </div>,
          { autoClose: 5000 } // Auto dismiss after 5 seconds
        );
      } else {
        toast.error(
          <div>
            ❌ <strong>Trade Failed!</strong>
            <br />
            Please try again or check your balance.
          </div>,
          { autoClose: 7000 } // Auto dismiss after 7 seconds
        );
      }
    } catch (error) {
      toast.error(`❌ Trade error: ${error.message}`);
    } finally {
      setTxPending(false);
    }
  };

  const tokenInfoSection = (
    <div className='flex flex-col gap-4 p-6 '>
      <div className='flex gap-[22px] items-start'>
        <Image
          src={tokenInfo?.image_uri}
          width={100}
          height={100}
          alt=""
        />
        <div className='flex flex-col gap-2'>
          <p className='text-base font-bold text-white'>{tokenInfo?.name} ({tokenInfo?.symbol})</p>
          <p className='text-xs font-medium text-[#808080]'
            style={{
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              lineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >{tokenInfo?.description}</p>
        </div>
      </div>
      <div className='flex flex-col gap-2'>
        <p className='text-sm text-white font-medium'>
          bonding curve progress: {isPoolComplete ? "100" : bondingCurveProgress}%
        </p>
        <Progress progress={isPoolComplete ? 100 : bondingCurveProgress} size="sm" color="white" theme={ProgressTheme} />
      </div>
      {!isPoolComplete &&
        <p className='text-sm font-medium text-[#808080]'>
          when the market cap reaches $69,000 all the liquidity from the bonding curve will be deposited into Raydium and burned. progression increases as the price goes up.
          <br />
          <br />
          there are {isPoolComplete ? 0 : (tokensAvailableForSale !== null ? tokensAvailableForSale : '751,404,142')} tokens still available for sale in the bonding curve and there is {isPoolComplete ? 0 : (tokenInfo?.virtual_sol_reserves !== null ? (tokenInfo?.virtual_sol_reserves / tokenDecimal).toFixed(2) : '1,213')} SOL in the bonding curve.
        </p>}
    </div>
  )

  return (
    <section className={`z-10 flex flex-col sm:flex-row px-2 sm:px-8`}>
      <div className="z-10 flex sm:hidden flex-col w-full">
        <div className="flex">
          <div className='relative w-full'>
            <button type="button" className={clsx('text-xl text-center py-4 uppercase transition-shadow w-full hover:bg-[#2b2a2a80] bg-[#2b2a2a49]', currentMode === 'buy' ? 'text-white font-bold' : 'text-[#808080]')} onClick={() => setCurrentMode('buy')}>buys</button>
            {currentMode === 'buy' && (
              <div className='absolute bottom-0 w-full h-[2px] bg-white'></div>
            )}
          </div>
          <div className='relative w-full'>
            <button type="button" className={clsx('text-xl text-center py-4 uppercase transition-shadow hover:bg-[#2b2a2a80] w-full bg-[#2b2a2a49]', currentMode === 'sell' ? 'text-white font-bold' : 'text-[#808080]')} onClick={() => setCurrentMode('sell')}>sell</button>
            {currentMode === 'sell' && (
              <div className='absolute bottom-0 w-full h-[2px] bg-white'></div>
            )}
          </div>
        </div>
        <div className='flex flex-col gap-5 p-6'>
          <div className='relative'>
            <input value={amount} onChange={onChangeAmount} type='number' className='px-6 py-4 bg-[#3a3a3a77] h-[66px] text-sm border border-white text-[#808080] w-full rounded-lg' placeholder='0.0' />
            {currentMode === 'buy' ? (
              <div className='absolute right-4 inset-y-4 flex items-center bg-[#52525294] gap-[10px]'>
                <p className='text-sm text-white uppercase'>SOL</p>
                <Image
                  className='rounded-full'
                  src='/img7.png'
                  width={34}
                  height={34}
                  alt="sol"
                />
              </div>
            ) : (
              <div className='absolute right-4 inset-y-4 flex items-center gap-[10px]'>
                <p className='text-sm text-white uppercase'>{tokenInfo?.symbol}</p>
                <Image
                  className='rounded-full'
                  src={tokenInfo?.image_uri}
                  width={34}
                  height={34}
                  alt="coin"
                />
              </div>
            )}
          </div>
          {currentMode === 'buy' ? (
            <div className='flex gap-1'>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(0)}>reset</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(1)}>1 SOL</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(5)}>5 SOL</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(10)}>10 SOL</button>
            </div>
          ) : (
            <div className='flex gap-1'>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(0)}>reset</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(walletBalance / 4)}>25%</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(walletBalance / 2)}>50%</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount((walletBalance / 4) * 3)}>75%</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(walletBalance)}>100%</button>
            </div>
          )}
          <button type='button' className={`bg-white hover:bg-[#a7a7a7] rounded-lg py-4 text-base `} onClick={onTrade}>Place trade</button>
        </div>
      </div>
      <div className='z-10 flex flex-col w-full px-1'>
        {isPoolComplete === true && (
          <div className='flex items-center gap-2 bg-[#86efac] p-4 rounded-md w-fit'>
            <p className='text-black text-xl'>raydium pool seeded! view the coin on raydium</p>
            <a href={`https://dexscreener.com/${addr}`} target='_blank' className='text-xl font-medium hover:underline text-[#6cc9c6]'>here</a>
          </div>
        )}
        <div className='flex flex-wrap py-2 gap-4 items-center'>
          <p className='text-sm text-white'>{`${tokenInfo?.name} (${tokenInfo?.symbol})`}</p>
          <div className='flex gap-2 items-center'>
            <p className='text-sm text-[#3FDC4F]'>created by</p>
            <Image
              src={!tokenInfo?.image_uri ? "/img3.png" : `${tokenInfo?.image_uri}`}
              width={16}
              height={16}
              alt=""
            />
            <Link href={`/profile/${tokenInfo?.creator}`} className={`text-xs text-white hover:underline`}>{tokenInfo?.username === null ? formatAddress(tokenInfo?.creator) : tokenInfo?.username}</Link>
          </div>
          <p className='text-sm text-[#3FDC4F]'>Market cap: ${Number(tokenInfo?.usd_market_cap).toFixed(2)}</p>
          <p className='text-sm text-[#3FDC4F]'>Virtual liquidity: ${virtualLiquidity}</p>

        </div>
        {/* <Chart /> */}
        <iframe className={`w-[90%] h-[600px]`} src={`https://dexscreener.com/solana/${tokenInfo?.mint}?embed=1&theme=dark&trades=0&info=0`}></iframe>
      </div>
      <div className="z-10 flex flex-col sm:max-w-sm w-full pb-20">
        <div className="hidden sm:flex">
          <div className='relative w-full'>
            <button type="button" className={clsx('text-xl text-center py-4 uppercase hover:bg-[#2b2a2a80] w-full bg-[#2b2a2a49]', currentMode === 'buy' ? 'text-white font-bold' : 'text-[#808080]')} onClick={() => setCurrentMode('buy')}>buy</button>
            {currentMode === 'buy' && (
              <div className='absolute bottom-0 w-full h-[2px] bg-white'></div>
            )}
          </div>
          <div className='relative w-full'>
            <button type="button" className={clsx('text-xl text-center py-4 uppercase hover:bg-[#2b2a2a80] w-full bg-[#2b2a2a49]', currentMode === 'sell' ? 'text-white font-bold' : 'text-[#808080]')} onClick={() => setCurrentMode('sell')}>sell</button>
            {currentMode === 'sell' && (
              <div className='absolute bottom-0 w-full h-[2px] bg-white'></div>
            )}
          </div>
        </div>
        <div className='hidden sm:flex flex-col gap-5 p-6'>
          <div className='relative'>
            <input value={amount} onChange={onChangeAmount} type='number' className='px-6 py-2 bg-[#40404169] placeholder-white focus:border-white h-[46px] text-sm border border-white text-white w-full rounded-lg' placeholder='0.0' />
            {currentMode === 'buy' ? (
              <div className='absolute right-4 inset-y-4 flex items-center gap-[10px]'>
                <p className='text-sm text-white uppercase'>SOL</p>
                <Image
                  className='rounded-full'
                  src='/img7.png'
                  width={34}
                  height={34}
                  alt="sol"
                />
              </div>
            ) : (
              <div className='absolute right-4 inset-y-4 flex items-center gap-[10px]'>
                <p className='text-sm text-white uppercase'>{tokenInfo?.symbol}</p>
                <Image
                  className='rounded-full'
                  src={tokenInfo?.image_uri}
                  width={34}
                  height={34}
                  alt="coin"
                />
              </div>
            )}
          </div>
          {currentMode === 'buy' ? (
            <div className='flex gap-1'>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(0)}>reset</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(1)}>1 SOL</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(5)}>5 SOL</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(10)}>10 SOL</button>
            </div>
          ) : (
            <div className='flex gap-1'>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(0)}>reset</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(walletBalance / 4)}>25%</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(walletBalance / 2)}>50%</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount((walletBalance / 4) * 3)}>75%</button>
              <button type='button' className='bg-[#2b2a2a49] px-4 py-1 rounded-lg text-sm text-white' onClick={() => setAmount(walletBalance)}>100%</button>
            </div>
          )}
          <button type='button' className={`bg-white hover:bg-[#a7a7a7] rounded-lg py-2 text-base `} onClick={onTrade}>Place trade</button>
        </div>
        {(tokenInfo?.twitter || tokenInfo?.telegram || tokenInfo?.website) && (
          <div className='flex justify-center gap-9 py-5 mx-auto bg-[#31313160] border-1 border-[#ffffff] w-full'>
            {tokenInfo?.twitter !== null && (
              <a href={`${tokenInfo?.twitter}`} target='_blank' className='flex justify-center items-center gap-2'>
                <p className='text-sm font-semibold text-white'>Twitter</p>
                <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.4932 14.5713L10.8025 7.91176L10.2722 7.15858L6.91672 2.39479L6.63872 2H2.51562L3.52121 3.42805L7.98264 9.76281L8.51295 10.5152L12.0976 15.605L12.3757 15.9994H16.4988L15.4932 14.5713ZM12.8657 15.0879L9.14154 9.80001L8.61123 9.04729L4.28969 2.91142H6.1486L9.64345 7.87364L10.1738 8.62636L14.7246 15.0878H12.8657V15.0879Z" fill="white" />
                  <path d="M8.61175 9.047L9.14206 9.79971L8.51335 10.5148L3.68954 15.9989H2.5L7.98304 9.7624L8.61175 9.047Z" fill="white" />
                  <path d="M16.0034 2L10.8036 7.91176L10.1748 8.62636L9.64453 7.87364L10.2732 7.15858L13.7956 3.15211L14.8139 2H16.0034Z" fill="white" />
                </svg>
              </a>
            )}
            {tokenInfo?.telegram !== null && (
              <a href={`${tokenInfo?.telegram}}`} target='_blank' className='flex justify-center items-center gap-2'>
                <p className='text-sm font-semibold text-white'>Telegram</p>
                <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.4053 2.49219L2 8.31948V9.16179L6.12586 10.4355L7.43071 14.6217L8.47232 14.6215L10.1517 12.9033L13.6968 15.5072L14.3868 15.2446L17 2.9913L16.4053 2.49219ZM13.669 14.3961L9.00003 10.9667L8.47965 11.6751L9.4362 12.3777L8.07747 13.7426L7.0113 10.3222L13.1867 6.63502L12.7361 5.88029L6.46982 9.6217L3.43831 8.68586L15.9677 3.61745L13.669 14.3961Z" fill="white" />
                </svg>
              </a>
            )}
            {tokenInfo?.website !== null && (
              <a href={`${tokenInfo?.website}`} target='_blank' className='flex justify-center items-center gap-2'>
                <p className='text-sm font-semibold text-white'>Website</p>
                <svg width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.5 0.5625C7.83122 0.5625 6.19992 1.05735 4.81238 1.98448C3.42484 2.9116 2.34338 4.22936 1.70477 5.77111C1.06616 7.31286 0.899065 9.00936 1.22463 10.6461C1.55019 12.2828 2.35378 13.7862 3.53379 14.9662C4.7138 16.1462 6.21721 16.9498 7.85393 17.2754C9.49064 17.6009 11.1871 17.4338 12.7289 16.7952C14.2706 16.1566 15.5884 15.0752 16.5155 13.6876C17.4427 12.3001 17.9375 10.6688 17.9375 9C17.935 6.76301 17.0452 4.61837 15.4634 3.03658C13.8816 1.45479 11.737 0.565031 9.5 0.5625ZM9.5 16.3125C8.33844 16.3125 7.12232 14.8151 6.51875 12.375H12.4813C11.8777 14.8151 10.6616 16.3125 9.5 16.3125ZM6.29038 11.25C6.06988 9.7581 6.06988 8.2419 6.29038 6.75H12.7096C12.8212 7.49478 12.8765 8.24691 12.875 9C12.8765 9.75309 12.8212 10.5052 12.7096 11.25H6.29038ZM2.1875 9C2.18791 8.23587 2.30864 7.47657 2.54525 6.75H5.16088C4.94638 8.24233 4.94638 9.75767 5.16088 11.25H2.54525C2.30864 10.5234 2.18791 9.76413 2.1875 9ZM9.5 1.6875C10.6616 1.6875 11.8777 3.18488 12.4813 5.625H6.51875C7.12232 3.18488 8.33844 1.6875 9.5 1.6875ZM13.8391 6.75H16.4548C16.9316 8.2121 16.9316 9.7879 16.4548 11.25H13.8391C13.9458 10.5047 13.9996 9.75286 14 9C13.9996 8.24714 13.9458 7.49526 13.8391 6.75ZM15.9806 5.625H13.6366C13.3863 4.40157 12.8955 3.24004 12.1927 2.20781C13.8229 2.85795 15.1666 4.07012 15.9806 5.625ZM6.80732 2.20781C6.10451 3.24004 5.6137 4.40157 5.36338 5.625H3.01944C3.83345 4.07012 5.17711 2.85795 6.80732 2.20781ZM3.01944 12.375H5.36338C5.6137 13.5984 6.10451 14.76 6.80732 15.7922C5.17711 15.142 3.83345 13.9299 3.01944 12.375ZM12.1927 15.7922C12.8955 14.76 13.3863 13.5984 13.6366 12.375H15.9806C15.1666 13.9299 13.8229 15.142 12.1927 15.7922Z" fill="white" />
                </svg>
              </a>
            )}
          </div>
        )}
        <div className='max-md:hidden'>
          {tokenInfoSection}
        </div>
      </div>
    </section>
  )
}
