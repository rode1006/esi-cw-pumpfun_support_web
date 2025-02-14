"use client"

import Image from "next/image";
import Link from 'next/link';
import { useRef, useEffect, useState, useCallback } from 'react';
import clsx from 'clsx';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from '@headlessui/react';
import { CheckIcon } from '@heroicons/react/20/solid';
import { getTokenData } from "../../utils/getTokens";
import { formatAddress } from "@/utils/format";

const sortType = [
  { id: 1, name: 'sort: Market Cap' },
  { id: 2, name: 'sort: Time' },
  { id: 4, name: 'sort: Last Reply' },
]

export default function BoardPage() {
  const tokenDiv = useRef(null)
  const [sortSelected, setSortSelected] = useState(sortType[0])
  const [showAnimations, setShowAnimations] = useState(true)
  const showAnimationsRef = useRef(showAnimations)
  const [includeNSFW, setIncludeNSFW] = useState(false)
  const [tokenData, setTokenData] = useState(null)
  const [filteredTokens, setFilteredTokens] = useState([]);


  useEffect(() => {
    setTokenData((prevTokens) => sortTokens(prevTokens ? [...prevTokens] : [], sortSelected.name));
  }, [sortSelected]);

  useEffect(() => {
    showAnimationsRef.current = showAnimations
  }, [showAnimations])

  const getTokens = useCallback(async () => {
    const result = await getTokenData();
    const filteredTokens = result.filter(token => includeNSFW ? token.nsfw === true : token.nsfw === false);
    setTokenData(sortTokens(filteredTokens, sortSelected.name));
  }, [includeNSFW, sortSelected]);


  useEffect(() => {
    getTokens();
    const interval = setInterval(() => {
      if (tokenDiv.current && showAnimationsRef.current === true) {
        tokenDiv.current.classList.toggle("animate-shake");
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [getTokens]);

  const [searchValue, setSearchValue] = useState("");

  const searchTokens = useCallback(() => {
    if (!tokenData) return;

    const trimmedSearchValue = searchValue.toLowerCase().trim();

    if (!trimmedSearchValue) {
      setFilteredTokens(sortTokens([...tokenData], sortSelected.name));
      return;
    }

    const matchingTokens = tokenData.filter(token =>
      token.name.toLowerCase().includes(trimmedSearchValue) ||
      token.symbol.toLowerCase().includes(trimmedSearchValue) ||
      token.description.toLowerCase().includes(trimmedSearchValue)
    );

    setFilteredTokens(sortTokens(matchingTokens, sortSelected.name));
  }, [tokenData, sortSelected, searchValue]);

  useEffect(() => {
    searchTokens();
  }, [searchValue, searchTokens]);

  function sortTokens(tokens, sort) {
    let sortBy = "usd_market_cap";

    if (sort === "sort: Market Cap") sortBy = "usd_market_cap";
    else if (sort === "sort: Time") sortBy = "created_timestamp";
    else if (sort === "sort: Last Reply") sortBy = "last_reply";

    return [...tokens].sort((a, b) => b[sortBy] - a[sortBy]);
  }


  return (
    <section className={`z-10 flex flex-col pt-10 sm:pt-4 gap-4 justify-center px-2 pb-20`}>
      <div className='z-[9] flex flex-col gap-8'>
        <Link href="/create" className='flex p-2 rounded-lg mx-auto font-semibold text-2xl hover:text-gray-300 bg-[#c7c7c728] text-white'>
          Start a new coin
        </Link>
      </div>
      <div className='z-10 flex flex-col gap-4'>
        <div className='relative w-full sm:max-w-[380px] sm:w-1/2 mx-auto'>
          <svg className='absolute right-4 inset-y-[15%] cursor-pointer' width="24" height="24" viewBox="0 0 37 36" fill="none" xmlns="http://www.w3.org/2000/svg" onClick={() => searchTokens()}>
            <g clipPath="url(#clip0_1_90)">
              <path d="M27.1461 24.9255L33.5706 31.3485L31.4481 33.471L25.0251 27.0465C22.6352 28.9623 19.6626 30.0044 16.5996 30C9.14761 30 3.09961 23.952 3.09961 16.5C3.09961 9.048 9.14761 3 16.5996 3C24.0516 3 30.0996 9.048 30.0996 16.5C30.104 19.563 29.0619 22.5356 27.1461 24.9255ZM24.1371 23.8125C26.0408 21.8548 27.1039 19.2306 27.0996 16.5C27.0996 10.698 22.4001 6 16.5996 6C10.7976 6 6.09961 10.698 6.09961 16.5C6.09961 22.3005 10.7976 27 16.5996 27C19.3303 27.0043 21.9544 25.9412 23.9121 24.0375L24.1371 23.8125Z" fill="white" />
            </g>
            <defs>
              <clipPath id="clip0_1_90">
                <rect width="36" height="36" fill="white" transform="translate(0.0996094)" />
              </clipPath>
            </defs>
          </svg>
          <input
            type="text"
            value={searchValue}
            className={`w-full h-[40px] bg-[#6c6d6e21] placeholder-gray-300 p-4 rounded-lg border border-white focus:border-white text-white text-sm`}
            placeholder="Search for token"
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        <div className='flex flex-col gap-6'>
          <div className='flex flex-col gap-6 sm:px-12'>
            <div className='flex flex-col sm:flex-row items-center gap-6'>
              <div className='flex flex-col sm:flex-row gap-3 max-sm:w-full'>
                <Listbox value={sortSelected} onChange={setSortSelected}>
                  <ListboxButton
                    className={clsx(
                      `group flex justify-between items-center w-[170px] max-sm:w-full bg-[#686c74] rounded-lg px-4 py-[10px] text-sm text-white`,
                      `focus:outline-none data-[focus]:outline-none`
                    )}
                  >
                    {sortSelected.name}
                    <svg className='group-data-[open]:rotate-180' width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.5373 21.75C17.6459 21.75 21.7873 17.6086 21.7873 12.5C21.7873 7.39137 17.6459 3.25 12.5373 3.25C7.42866 3.25 3.28729 7.39137 3.28729 12.5C3.28729 17.6086 7.42866 21.75 12.5373 21.75Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14.9473 11.5L12.5373 13.5L10.1273 11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </ListboxButton>
                  <Transition leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <ListboxOptions
                      anchor="bottom"
                      className="w-[var(--button-width)] rounded-lg border border-white/5 bg-[#686c74d8] p-1 [--anchor-gap:var(--spacing-1)] focus:outline-none z-10"
                    > 
                      {sortType.map((sort) => (
                        <ListboxOption
                          key={sort.name}
                          value={sort}
                          className="group flex cursor-default items-center gap-2 rounded-lg py-1.5 px-3 select-none data-[focus]:bg-white/10"
                          onClick={() => sortTokens([...tokenData], sort.name)}
                        >
                          <CheckIcon className="invisible size-4 fill-white group-data-[selected]:visible" />
                          <div className={`text-sm text-white`}>{sort.name}</div>
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </Transition>
                </Listbox>
              </div>
              <div className='flex gap-8'>
                <div className='flex gap-1'>
                  <p className={`text-sm text-white`}>Show animations:</p>
                  <div className='flex gap-1 items-center'>
                    <button type="button" className={clsx('rounded-[4px] px-2 text-sm', showAnimations === true ? 'bg-white text-black' : 'bg-none text-white')} onClick={() => setShowAnimations(true)}>On</button>
                    <button type="button" className={clsx('rounded-[4px] px-2 text-sm', showAnimations === true ? 'bg-none text-white' : 'bg-white text-black')} onClick={() => setShowAnimations(false)}>Off</button>
                  </div>
                </div>
                <div className='flex gap-1'>
                  <p className={`text-sm text-white`}>Include nsfw:</p>
                  <div className='flex gap-1 items-center'>
                    <button type="button" className={clsx('rounded-[4px] px-2 text-sm', includeNSFW === true ? 'bg-white text-black' : 'bg-none text-white')} onClick={() => {
                      setIncludeNSFW(true)
                    }}>On</button>
                    <button type="button" className={clsx('rounded-[4px] px-2 text-sm', includeNSFW === true ? 'bg-none text-white' : 'bg-white text-black')} onClick={() => {
                      setIncludeNSFW(false)
                    }}>Off</button>
                  </div>
                </div>
              </div>
            </div>
            <div className='grid grid-col-1 md:grid-cols-2 lg:grid-cols-3 text-gray-400 gap-4 lg:gap-x-4 lgplus:gap-4'>
              {(filteredTokens === null ? tokenData : filteredTokens)?.map((item, index) => {
                return (
                  <div key={index} className="relative group">
                    <Link ref={index === 0 ? tokenDiv : null} href={`/token/${item.mint}`}>
                      <div className='max-h-[300px] overflow-hidden h-fit p-2 flex border bg-[#12141665] shadow-[0px_0px_8.5px_5px_rgba(232,232,234,0.37)] group-hover:border-white gap-2 w-full  border-transparent'>
                        <div className="min-w-32 relative self-start">
                          <Image
                            src={item.image_uri}
                            loading="lazy"
                            width={128}
                            height={128}
                            className="mr-4 w-32 h-auto"
                            alt=""
                          />
                        </div>
                        <div className='gap-1 grid h-fit'>
                          <div className='text-xs text-blue-200 flex flex-wrap items-center gap-1'>
                            <p className={`text-xs text-white`}>Creator</p>
                            <Image
                              src={item.profile_image === null ? "/img3.png" : item.profile_image}
                              width={18}
                              height={18}
                              alt=""
                            />
                            <Link href={`/profile/${item.creator}`} className={`text-xs text-white hover:underline`}>{item.username === null ? formatAddress(item.creator) : item.username}</Link>
                          </div>
                          <p className={`text-xs text-green-300 flex gap-1`}>Market cap: {parseFloat(item.usd_market_cap / 1000).toFixed(2)}K</p>
                          <p className={`text-xs text-[#9ca3ab] flex items-center gap-2`}>Replies: {item.reply_count}</p>
                          <p className={`text-sm text-[#9ca3ab] w-full break-words break-anywhere`} 
                            style={{
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 7,
                              lineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}
                          ><span className='font-bold'>{`${item.name} (ticker: ${item.symbol}): `}</span>{item.description}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}