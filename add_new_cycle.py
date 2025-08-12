
import json
from datetime import datetime, timedelta

def update_market_cycles():
    try:
        with open('C:/Users/mikel/Desktop/VS Code/bitcoin.history/public/market-cycles.json', 'r') as f:
            cycles = json.load(f)
    except (IOError, json.JSONDecodeError) as e:
        print(f"Error reading or parsing market-cycles.json: {e}")
        return

    new_bull_run = {
        "type": "bull",
        "startDate": "2010-08-05",
        "endDate": "2011-06-09",
        "label": "Primer Bull Run Histórico"
    }

    # Convert dates to datetime objects for easier comparison
    for cycle in cycles:
        cycle['start_dt'] = datetime.strptime(cycle['startDate'], '%Y-%m-%d')
        cycle['end_dt'] = datetime.strptime(cycle['endDate'], '%Y-%m-%d')
    
    new_bull_run['start_dt'] = datetime.strptime(new_bull_run['startDate'], '%Y-%m-%d')
    new_bull_run['end_dt'] = datetime.strptime(new_bull_run['endDate'], '%Y-%m-%d')

    # Insert the new bull run in chronological order
    updated_cycles = []
    inserted = False
    for cycle in cycles:
        if not inserted and new_bull_run['start_dt'] < cycle['start_dt']:
            updated_cycles.append(new_bull_run)
            inserted = True
        updated_cycles.append(cycle)
    
    if not inserted: # If it's the latest cycle
        updated_cycles.append(new_bull_run)

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

    print("Market cycles updated with the new bull run.")

if __name__ == '__main__':
    update_market_cycles()
