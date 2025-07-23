import { DrinkFromDatabase } from '../screens/addadrink';

// Embedded CSV data for drinks database
const DRINKS_CSV_DATA = `Drink,fl oz,Caffeine (mg),mg/floz
28 Black Energy Drink,8.46,80,9.5
3 Water,16.9,50,3.0
3D Energy Drink,16,200,12.5
4 Purpose Energy Drink,8.46,70,8.3
4C Energy Drink Mix,16.9,170,10.1
5 Hour Energy,1.93,200,103.6
5 Hour Energy Extra Strength,1.93,230,119.2
7 Eleven Brewed Coffee,16,280,17.5
7-Eleven Energy Shot,2,260,130.0
A Shoc,16,250,15.6
Alani Nu Energy Drink,12,200,16.7
Alpine Start Instant Coffee,8,120,15.0
Americano Coffee,12,154,12.8
Bang Energy,16,300,18.8
Bang Keto Coffee,16,300,18.8
Bang Natural,16,250,15.6
Bang Shot,3,300,100.0
Bawls,16,102,6.4
Celsius Energy Drink,12,200,16.7
Chai Tea,8,50,6.2
Coffee,8,163,20.4
Coffee (Instant),8,57,7.1
Coca-Cola Classic,12,34,2.8
Coca-Cola Energy,12,114,9.5
Death Wish Coffee,12,728,60.7
Diet Coke,12,46,3.8
Dr Pepper,12,42,3.5
Dunkin' Donuts Brewed Coffee,14,210,15.0
Espresso Shot,1.5,77,51.3
GFuel Energy Drink Mix,16,140,8.8
Green Tea,8,18,2.2
Java Monster,15,200,13.3
Latte,16,154,9.6
Monster Energy,16,160,10.0
Mountain Dew,12,54,4.5
NOS Energy Drink,16,160,10.0
Pepsi,12,38,3.2
Red Bull,8.46,80,9.5
Reign Total Body Fuel,16,300,18.8
Rockstar Energy Drink (Original),16,160,10.0
Starbucks Grande Coffee,16,310,19.4
Starbucks Pike Place Coffee,16,310,19.4
Tea (Black),8,42,5.2
Tea (Green),8,18,2.2`;

// Parse CSV and return drinks database
export const getDrinksDatabase = (): DrinkFromDatabase[] => {
  const lines = DRINKS_CSV_DATA.trim().split('\n');
  const drinks: DrinkFromDatabase[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const [name, flOz, caffeineMg, mgPerFlOz] = line.split(',');
    
    if (name && flOz && caffeineMg && mgPerFlOz) {
      drinks.push({
        name: name.trim(),
        flOz: parseFloat(flOz),
        caffeineMg: parseFloat(caffeineMg),
        mgPerFlOz: parseFloat(mgPerFlOz)
      });
    }
  }
  
  return drinks;
}; 