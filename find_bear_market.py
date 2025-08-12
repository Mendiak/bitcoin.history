
import json
from datetime import datetime, timedelta

def find_early_bear_market():
    try:
        with open('C:/Users/mikel/Desktop/VS Code/bitcoin.history/public/bitcoin-price-history.json', 'r') as f:
            prices_data = json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f"Error reading or parsing bitcoin-price-history.json: {e}")
        return

    prices = prices_data.get('prices')
    if not prices:
        print("No 'prices' key found in bitcoin-price-history.json")
        return

    # Define the period of interest
    start_date_interest = datetime(2011, 6, 10) # Day after the previous bull run ended
    end_date_interest = datetime(2012, 11, 27) # Day before the next bull run started

    relevant_prices = []
    for timestamp, price in prices:
        date = datetime.fromtimestamp(timestamp / 1000)
        if start_date_interest <= date <= end_date_interest:
            relevant_prices.append((date, price))

    if not relevant_prices:
        print("No price data found for the specified period.")
        return

    # Find the lowest price in this period
    bear_market_trough_date, bear_market_trough_price = min(relevant_prices, key=lambda x: x[1])

    print(f"Proposed Bear Market: From {start_date_interest.strftime('%Y-%m-%d')} to {bear_market_trough_date.strftime('%Y-%m-%d')} (Lowest Price: {bear_market_trough_price:.4f})")

if __name__ == '__main__':
    find_early_bear_market()
