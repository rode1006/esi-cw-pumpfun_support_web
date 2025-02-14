export const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}`;
};

export const formatIpfsUrl = (url) => {
    if (!url) return "/fallback-image.png"; // Use a default image if missing
    return url.startsWith("ipfs://")
        ? url.replace("ipfs://", "https://ipfs.io/ipfs/")
        : url;
};
