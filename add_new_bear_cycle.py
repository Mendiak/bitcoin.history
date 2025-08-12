
import json
from datetime import datetime, timedelta

def update_market_cycles_with_bear():
    try:
        with open('C:/Users/mikel/Desktop/VS Code/bitcoin.history/public/market-cycles.json', 'r') as f:
            cycles = json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f"Error reading or parsing market-cycles.json: {e}")
        return

    new_bear_market = {
        "type": "bear",
        "startDate": "2011-06-10",
        "endDate": "2011-11-20",
        "label": "Primer Mercado Bajista"
    }

    # Convert dates to datetime objects for easier comparison
    for cycle in cycles:
        cycle['start_dt'] = datetime.strptime(cycle['startDate'], '%Y-%m-%d')
        cycle['end_dt'] = datetime.strptime(cycle['endDate'], '%Y-%m-%d')
    
    new_bear_market['start_dt'] = datetime.strptime(new_bear_market['startDate'], '%Y-%m-%d')
    new_bear_market['end_dt'] = datetime.strptime(new_bear_market['endDate'], '%Y-%m-%d')

    # Insert the new bear market in chronological order
    updated_cycles = []
    inserted = False
    for cycle in cycles:
        if not inserted and new_bear_market['start_dt'] < cycle['start_dt']:
            updated_cycles.append(new_bear_market)
            inserted = True
        updated_cycles.append(cycle)
    
    if not inserted: # If it's the latest cycle
        updated_cycles.append(new_bear_market)

    # Sort again to be sure, and remove temporary datetime objects
    updated_cycles.sort(key=lambda x: x['start_dt'])
    for cycle in updated_cycles:
        del cycle['start_dt']
        del cycle['end_dt']

    # Adjust subsequent start dates
    for i in range(len(updated_cycles) - 1):
        current_cycle_end_date = datetime.strptime(updated_cycles[i]['endDate'], '%Y-%m-%d').date()
        next_cycle_start_date = datetime.strptime(updated_cycles[i+1]['startDate'], '%Y-%m-%d').date()
        
        # If the next cycle starts before or on the same day as the current one ends, adjust it
        if next_cycle_start_date <= current_cycle_end_date:
            updated_cycles[i+1]['startDate'] = (current_cycle_end_date + timedelta(days=1)).strftime('%Y-%m-%d')

    with open('C:/Users/mikel/Desktop/VS Code/bitcoin.history/public/market-cycles.json', 'w') as f:
        json.dump(updated_cycles, f, indent=2)

    print("Market cycles updated with the new bear market.")

if __name__ == '__main__':
    update_market_cycles_with_bear()
