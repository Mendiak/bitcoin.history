
import json
from datetime import datetime

def find_early_bull_run():
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
    start_date_interest = datetime(2010, 8, 1)
    end_date_interest = datetime(2011, 6, 30)

    relevant_prices = []
    for timestamp, price in prices:
        date = datetime.fromtimestamp(timestamp / 1000)
        if start_date_interest <= date <= end_date_interest:
            relevant_prices.append((date, price))

    if not relevant_prices:
        print("No price data found for the specified period.")
        return

    # Let's find the lowest price around August 2010
    # and the highest price around June 2011
    
    # To be more precise, let's find the lowest point in the first few months
    # and the highest point in the last few months of the specified range.

    # Let's define sub-windows for finding the start and end of the rally
    start_window_end = datetime(2010, 10, 31) # End of October 2010
    end_window_start = datetime(2011, 4, 1) # Start of April 2011

    potential_start_prices = []
    potential_end_prices = []

    for date, price in relevant_prices:
        if date <= start_window_end:
            potential_start_prices.append((date, price))
        if date >= end_window_start:
            potential_end_prices.append((date, price))

    if not potential_start_prices or not potential_end_prices:
        print("Could not find sufficient data in the sub-windows to identify the rally.")
        return

    # Find the minimum price in the potential start window
    rally_start_date, rally_start_price = min(potential_start_prices, key=lambda x: x[1])

    # Find the maximum price in the potential end window
    rally_end_date, rally_end_price = max(potential_end_prices, key=lambda x: x[1])

    print(f"Proposed Bull Run: From {rally_start_date.strftime('%Y-%m-%d')} (Price: {rally_start_price:.4f}) to {rally_end_date.strftime('%Y-%m-%d')} (Price: {rally_end_price:.2f})")

if __name__ == '__main__':
    find_early_bull_run()
