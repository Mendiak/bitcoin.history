import json
from datetime import datetime, timedelta

def analyze_and_refine_cycles():
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

    try:
        with open('C:/Users/mikel/Desktop/VS Code/bitcoin.history/public/market-cycles.json', 'r') as f:
            cycles = json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f"Error reading or parsing market-cycles.json: {e}")
        return

    prices_timestamps = {datetime.fromtimestamp(p[0] / 1000).date(): p[1] for p in prices}

    refined_cycles = []
    for cycle in cycles:
        start_date = datetime.strptime(cycle['startDate'], '%Y-%m-%d').date()
        end_date = datetime.strptime(cycle['endDate'], '%Y-%m-%d').date()
        
        window_start = end_date - timedelta(days=60)
        window_end = end_date + timedelta(days=60)
        
        prices_in_window = []
        current_date = window_start
        while current_date <= window_end:
            if current_date in prices_timestamps:
                prices_in_window.append((current_date, prices_timestamps[current_date]))
            current_date += timedelta(days=1)

        if not prices_in_window:
            refined_date = end_date
        else:
            if cycle['type'] == 'bull':
                refined_date = max(prices_in_window, key=lambda x: x[1])[0]
            else:
                refined_date = min(prices_in_window, key=lambda x: x[1])[0]

        new_cycle = cycle.copy()
        new_cycle['endDate'] = refined_date.strftime('%Y-%m-%d')
        refined_cycles.append(new_cycle)

    for i in range(len(refined_cycles) - 1):
        current_cycle_end_date = datetime.strptime(refined_cycles[i]['endDate'], '%Y-%m-%d').date()
        next_cycle_start_date = current_cycle_end_date + timedelta(days=1)
        refined_cycles[i+1]['startDate'] = next_cycle_start_date.strftime('%Y-%m-%d')

    with open('C:/Users/mikel/Desktop/VS Code/bitcoin.history/public/market-cycles.json', 'w') as f:
        json.dump(refined_cycles, f, indent=2)

    print("Refined market cycles written to market-cycles.json")

if __name__ == '__main__':
    analyze_and_refine_cycles()