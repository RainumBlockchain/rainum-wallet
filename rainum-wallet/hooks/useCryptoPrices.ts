import { useState, useEffect } from 'react';

interface CryptoPair {
  pair: string;
  price: number;
  change24h: number;
  displayPrice: string;
}

interface CryptoPrices {
  pairs: CryptoPair[];
  loading: boolean;
  error: string | null;
}

const RAIN_USD_PRICE = 0.10; // RAIN base price in USD

export function useCryptoPrices(refreshInterval: number = 60000): CryptoPrices {
  const [prices, setPrices] = useState<CryptoPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const fetchPrices = async () => {
      try {
        // Fetch crypto prices from CoinGecko API (free, no API key needed)
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,binancecoin,solana,matic-network,tether,usd-coin&vs_currencies=usd&include_24hr_change=true'
        );

        if (!response.ok) {
          throw new Error('Failed to fetch crypto prices');
        }

        const data = await response.json();

        if (!isMounted) return;

        // Calculate RAIN price against each crypto
        const calculatedPairs: CryptoPair[] = [];

        // RAIN/ETH
        if (data.ethereum) {
          const ethPrice = data.ethereum.usd;
          const rainEthPrice = RAIN_USD_PRICE / ethPrice;
          calculatedPairs.push({
            pair: 'RAIN/ETH',
            price: rainEthPrice,
            change24h: data.ethereum.usd_24h_change || 0,
            displayPrice: rainEthPrice.toFixed(8),
          });
        }

        // RAIN/BTC
        if (data.bitcoin) {
          const btcPrice = data.bitcoin.usd;
          const rainBtcPrice = RAIN_USD_PRICE / btcPrice;
          calculatedPairs.push({
            pair: 'RAIN/BTC',
            price: rainBtcPrice,
            change24h: data.bitcoin.usd_24h_change || 0,
            displayPrice: rainBtcPrice.toFixed(8),
          });
        }

        // RAIN/BNB
        if (data.binancecoin) {
          const bnbPrice = data.binancecoin.usd;
          const rainBnbPrice = RAIN_USD_PRICE / bnbPrice;
          calculatedPairs.push({
            pair: 'RAIN/BNB',
            price: rainBnbPrice,
            change24h: data.binancecoin.usd_24h_change || 0,
            displayPrice: rainBnbPrice.toFixed(8),
          });
        }

        // RAIN/SOL
        if (data.solana) {
          const solPrice = data.solana.usd;
          const rainSolPrice = RAIN_USD_PRICE / solPrice;
          calculatedPairs.push({
            pair: 'RAIN/SOL',
            price: rainSolPrice,
            change24h: data.solana.usd_24h_change || 0,
            displayPrice: rainSolPrice.toFixed(8),
          });
        }

        // RAIN/MATIC
        if (data['matic-network']) {
          const maticPrice = data['matic-network'].usd;
          const rainMaticPrice = RAIN_USD_PRICE / maticPrice;
          calculatedPairs.push({
            pair: 'RAIN/MATIC',
            price: rainMaticPrice,
            change24h: data['matic-network'].usd_24h_change || 0,
            displayPrice: rainMaticPrice.toFixed(6),
          });
        }

        // RAIN/USDT
        if (data.tether) {
          calculatedPairs.push({
            pair: 'RAIN/USDT',
            price: RAIN_USD_PRICE,
            change24h: data.tether.usd_24h_change || 0,
            displayPrice: RAIN_USD_PRICE.toFixed(4),
          });
        }

        // RAIN/USDC
        if (data['usd-coin']) {
          calculatedPairs.push({
            pair: 'RAIN/USDC',
            price: RAIN_USD_PRICE,
            change24h: data['usd-coin'].usd_24h_change || 0,
            displayPrice: RAIN_USD_PRICE.toFixed(4),
          });
        }

        setPrices(calculatedPairs);
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching crypto prices:', err);
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchPrices();
    intervalId = setInterval(fetchPrices, refreshInterval);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshInterval]);

  return { pairs: prices, loading, error };
}
