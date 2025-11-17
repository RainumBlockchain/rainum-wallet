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

interface BinanceTickerData {
  e: string;      // Event type
  s: string;      // Symbol
  c: string;      // Current price
  P: string;      // Price change percent
}

export function useCryptoPrices(): CryptoPrices {
  const [prices, setPrices] = useState<CryptoPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    // Store latest prices for each symbol
    const latestPrices: { [key: string]: { price: number; change: number } } = {};

    const connectWebSocket = () => {
      try {
        // Connect to Binance combined streams for real-time price updates
        const streams = [
          'btcusdt@ticker',
          'ethusdt@ticker',
          'bnbusdt@ticker',
          'solusdt@ticker',
          'maticusdt@ticker',
        ].join('/');

        console.log('🔄 Connecting to Binance WebSocket...');
        ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

        ws.onopen = () => {
          console.log('🔴 Binance WebSocket connected - Live prices streaming');
          setError(null);
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;

          try {
            const message = JSON.parse(event.data);
            const data: BinanceTickerData = message.data;

            if (data && data.s && data.c && data.P) {
              const symbol = data.s.toLowerCase();
              const price = parseFloat(data.c);
              const change = parseFloat(data.P);

              // Update latest prices
              latestPrices[symbol] = { price, change };

              // Calculate RAIN prices against each crypto
              const calculatedPairs: CryptoPair[] = [];

              // RAIN/BTC
              if (latestPrices['btcusdt']) {
                const btcPrice = latestPrices['btcusdt'].price;
                const rainBtcPrice = RAIN_USD_PRICE / btcPrice;
                calculatedPairs.push({
                  pair: 'RAIN/BTC',
                  price: rainBtcPrice,
                  change24h: latestPrices['btcusdt'].change,
                  displayPrice: rainBtcPrice.toFixed(8),
                });
              }

              // RAIN/ETH
              if (latestPrices['ethusdt']) {
                const ethPrice = latestPrices['ethusdt'].price;
                const rainEthPrice = RAIN_USD_PRICE / ethPrice;
                calculatedPairs.push({
                  pair: 'RAIN/ETH',
                  price: rainEthPrice,
                  change24h: latestPrices['ethusdt'].change,
                  displayPrice: rainEthPrice.toFixed(8),
                });
              }

              // RAIN/BNB
              if (latestPrices['bnbusdt']) {
                const bnbPrice = latestPrices['bnbusdt'].price;
                const rainBnbPrice = RAIN_USD_PRICE / bnbPrice;
                calculatedPairs.push({
                  pair: 'RAIN/BNB',
                  price: rainBnbPrice,
                  change24h: latestPrices['bnbusdt'].change,
                  displayPrice: rainBnbPrice.toFixed(8),
                });
              }

              // RAIN/SOL
              if (latestPrices['solusdt']) {
                const solPrice = latestPrices['solusdt'].price;
                const rainSolPrice = RAIN_USD_PRICE / solPrice;
                calculatedPairs.push({
                  pair: 'RAIN/SOL',
                  price: rainSolPrice,
                  change24h: latestPrices['solusdt'].change,
                  displayPrice: rainSolPrice.toFixed(8),
                });
              }

              // RAIN/MATIC
              if (latestPrices['maticusdt']) {
                const maticPrice = latestPrices['maticusdt'].price;
                const rainMaticPrice = RAIN_USD_PRICE / maticPrice;
                calculatedPairs.push({
                  pair: 'RAIN/MATIC',
                  price: rainMaticPrice,
                  change24h: latestPrices['maticusdt'].change,
                  displayPrice: rainMaticPrice.toFixed(6),
                });
              }

              // RAIN/USDT (stable)
              calculatedPairs.push({
                pair: 'RAIN/USDT',
                price: RAIN_USD_PRICE,
                change24h: 0,
                displayPrice: RAIN_USD_PRICE.toFixed(4),
              });

              // RAIN/USDC (stable)
              calculatedPairs.push({
                pair: 'RAIN/USDC',
                price: RAIN_USD_PRICE,
                change24h: 0,
                displayPrice: RAIN_USD_PRICE.toFixed(4),
              });

              setPrices(calculatedPairs);
              setLoading(false);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (isMounted) {
            setError('WebSocket connection error');
          }
        };

        ws.onclose = () => {
          console.log('WebSocket closed - attempting reconnect in 5s');
          if (isMounted) {
            // Attempt to reconnect after 5 seconds
            reconnectTimeout = setTimeout(() => {
              if (isMounted) {
                connectWebSocket();
              }
            }, 5000);
          }
        };
      } catch (err) {
        console.error('Error connecting to WebSocket:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    };

    // Initial connection
    connectWebSocket();

    // Cleanup function
    return () => {
      isMounted = false;
      if (ws) {
        ws.close();
        ws = null;
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  return { pairs: prices, loading, error };
}
