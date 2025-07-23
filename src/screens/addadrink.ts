import { DrinkRecord } from '../types';

// Types for the new add drink workflow
export interface DrinkFromDatabase {
  name: string;
  flOz: number;
  caffeineMg: number;
  mgPerFlOz: number;
  isFavorited?: boolean;
}

export interface SearchDrinkData {
  selectedDrink: DrinkFromDatabase | null;
  ouncesConsumed: string;
  sipDuration: string;
  sipDurationDigits: string; // For right-to-left time input
  hoursAgo: number | null;
  completionPercentage: number;
}

export interface AddDrinkWorkflowState {
  showThreeButtons: boolean;
  showSearchModal: boolean;
  showQuickAddModal: boolean;
  showQuestionsModal: boolean;
  showCustomDrinkModal: boolean;
  searchQuery: string;
  filteredDrinks: DrinkFromDatabase[];
  favoritedDrinks: DrinkFromDatabase[];
  searchDrinkData: SearchDrinkData;
  customDrinkData: {
    drinkName: string;
    caffeineAmount: string;
    completionPercentage: number;
  };
}

// Parse the CSV data into DrinkFromDatabase objects
export const parseCSVToDrinkDatabase = (csvContent: string): DrinkFromDatabase[] => {
  const lines = csvContent.trim().split('\n');
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

// Filter drinks based on search query
export const filterDrinks = (drinks: DrinkFromDatabase[], query: string): DrinkFromDatabase[] => {
  if (!query.trim()) {
    return drinks;
  }
  
  const searchTerm = query.toLowerCase();
  return drinks.filter(drink => 
    drink.name.toLowerCase().includes(searchTerm)
  );
};

// Calculate actual caffeine consumed from search drink data
export const calculateCaffeineFromSearchDrink = (data: SearchDrinkData): number => {
  if (!data.selectedDrink) return 0;
  
  const ouncesNum = parseFloat(data.ouncesConsumed) || 0;
  const percentageDecimal = data.completionPercentage / 100;
  const actualCaffeine = ouncesNum * percentageDecimal * data.selectedDrink.mgPerFlOz;
  
  return Math.round(actualCaffeine);
};

// Convert hours ago to actual timestamp
export const calculateConsumptionTime = (hoursAgo: number): Date => {
  const now = new Date();
  return new Date(now.getTime() - (hoursAgo * 60 * 60 * 1000));
};

// Create drink record from search drink data
export const createDrinkRecordFromSearchData = (
  data: SearchDrinkData, 
  userId: string
): DrinkRecord => {
  const actualCaffeine = calculateCaffeineFromSearchDrink(data);
  const consumptionTime = data.hoursAgo !== null ? calculateConsumptionTime(data.hoursAgo) : new Date();
  
  return {
    id: Date.now().toString(),
    userId,
    name: data.selectedDrink?.name || 'Unknown Drink',
    caffeineAmount: actualCaffeine, // Total caffeine that would be in the full amount
    completionPercentage: data.completionPercentage,
    timeToConsume: data.sipDuration,
    actualCaffeineConsumed: actualCaffeine,
    timestamp: consumptionTime,
    recordedAt: new Date(),
  };
};

// Create drink record from custom drink data
export const createDrinkRecordFromCustomData = (
  customData: { drinkName: string; caffeineAmount: string; completionPercentage: number },
  userId: string
): DrinkRecord => {
  const caffeineAmountNum = parseFloat(customData.caffeineAmount) || 0;
  const actualCaffeine = Math.round((caffeineAmountNum * customData.completionPercentage) / 100);
  const now = new Date();
  
  return {
    id: Date.now().toString(),
    userId,
    name: customData.drinkName || 'Custom Drink',
    caffeineAmount: caffeineAmountNum,
    completionPercentage: customData.completionPercentage,
    timeToConsume: '00:00:00', // No time since no timer
    actualCaffeineConsumed: actualCaffeine,
    timestamp: now,
    recordedAt: now,
  };
};

// Right-to-left time input formatting (same as HomeScreen)
export const formatTimeFromDigits = (digits: string): string => {
  if (digits.length === 0) {
    return '00:00:00';
  }
  
  const lastSixDigits = digits.slice(-6);
  const paddedDigits = lastSixDigits.padStart(6, '0');
  
  const hours = paddedDigits.slice(0, 2);
  const minutes = paddedDigits.slice(2, 4);
  const seconds = paddedDigits.slice(4, 6);
  
  let h = parseInt(hours, 10);
  let m = parseInt(minutes, 10);
  let s = parseInt(seconds, 10);
  
  if (h > 23) h = 23;
  if (m > 59) m = 59;
  if (s > 59) s = 59;
  
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Toggle favorite status of a drink
export const toggleDrinkFavorite = (
  drinks: DrinkFromDatabase[], 
  drinkToToggle: DrinkFromDatabase
): DrinkFromDatabase[] => {
  return drinks.map(drink => {
    if (drink.name === drinkToToggle.name) {
      return { ...drink, isFavorited: !drink.isFavorited };
    }
    return drink;
  });
};

// Get favorited drinks from a list
export const getFavoritedDrinks = (drinks: DrinkFromDatabase[]): DrinkFromDatabase[] => {
  return drinks.filter(drink => drink.isFavorited);
};

// Default initial state
export const getInitialAddDrinkState = (): AddDrinkWorkflowState => ({
  showThreeButtons: false,
  showSearchModal: false,
  showQuickAddModal: false,
  showQuestionsModal: false,
  showCustomDrinkModal: false,
  searchQuery: '',
  filteredDrinks: [],
  favoritedDrinks: [],
  searchDrinkData: {
    selectedDrink: null,
    ouncesConsumed: '',
    sipDuration: '00:05:00',
    sipDurationDigits: '',
    hoursAgo: null,
    completionPercentage: 50,
  },
  customDrinkData: {
    drinkName: '',
    caffeineAmount: '',
    completionPercentage: 50,
  }
});

// Time ago options for the questions modal
export const TIME_AGO_OPTIONS = [
  { label: 'now', hours: 0 },
  { label: '15 min', hours: 0.25 },
  { label: '30 min', hours: 0.5 },
  { label: '45 min', hours: 0.75 },
  { label: '1 hour', hours: 1 },
  { label: '2 hours', hours: 2 },
  { label: '3 hours', hours: 3 },
  { label: '4 hours', hours: 4 },
  { label: '5 hours', hours: 5 },
  { label: '6 hours', hours: 6 },
]; 