/**
 * Format numbers in Indian numbering system with Rupee symbol
 * e.g., 500 -> ₹500, 2500 -> ₹2,500, 10000 -> ₹10,000, 100000 -> ₹1,00,000
 */
export function formatINR(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(Math.round(amount));

  // Use standard Indian locale formatting
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(absAmount);

  return `${isNegative ? '− ' : ''}₹${formatted}`;
}

/**
 * Get display title for monthKey (e.g. "2026-08" -> "August 2026")
 */
export function formatMonthLabel(monthKey: string): string {
  if (!monthKey) return 'This Month';
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const d = new Date(year, month, 1);
  if (isNaN(d.getTime())) return monthKey;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format date for simple mobile cards
 * Examples: "Today", "Yesterday", "27 Aug", "14 Aug 2025"
 */
export function formatDateLabel(dateString: string): string {
  if (!dateString) return 'Today';

  const [y, m, d] = dateString.split('-').map(Number);
  if (!y || !m || !d) {
    const parsed = new Date(dateString);
    if (isNaN(parsed.getTime())) return dateString;
    return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  const itemDate = new Date(y, m - 1, d);
  const now = new Date();
  
  const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffDays = Math.round((todayOnly.getTime() - itemDateOnly.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (itemDate.getFullYear() === now.getFullYear()) {
    return itemDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } else {
    return itemDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

/**
 * Smart emoji for description / category
 */
export function getSmartEmoji(description: string = '', category: string = ''): string {
  const combined = `${description} ${category}`.toLowerCase();
  
  if (combined.includes('shoe') || combined.includes('sneaker') || combined.includes('footwear')) return '👟';
  if (combined.includes('shirt') || combined.includes('cloth') || combined.includes('dress') || combined.includes('pant')) return '👕';
  if (combined.includes('lunch') || combined.includes('dinner') || combined.includes('burger') || combined.includes('food') || combined.includes('meal') || combined.includes('snack') || combined.includes('biryani')) return '🍔';
  if (combined.includes('pizza')) return '🍕';
  if (combined.includes('coffee') || combined.includes('tea') || combined.includes('chai')) return '☕';
  if (combined.includes('bus') || combined.includes('ticket') || combined.includes('travel') || combined.includes('auto') || combined.includes('metro') || combined.includes('cab') || combined.includes('uber') || combined.includes('ola')) return '🚌';
  if (combined.includes('train') || combined.includes('railway')) return '🚆';
  if (combined.includes('flight') || combined.includes('air')) return '✈️';
  if (combined.includes('recharge') || combined.includes('mobile') || combined.includes('phone') || combined.includes('wifi') || combined.includes('jio') || combined.includes('airtel')) return '📱';
  if (combined.includes('shop') || combined.includes('amazon') || combined.includes('flipkart') || combined.includes('mart') || combined.includes('grocery') || combined.includes('market')) return '🛍';
  if (combined.includes('college') || combined.includes('book') || combined.includes('exam') || combined.includes('fee') || combined.includes('tuition') || combined.includes('school')) return '🎓';
  if (combined.includes('movie') || combined.includes('cinema') || combined.includes('netflix') || combined.includes('game') || combined.includes('hotstar')) return '🎬';
  if (combined.includes('petrol') || combined.includes('fuel') || combined.includes('diesel')) return '⛽';
  if (combined.includes('medicine') || combined.includes('doctor') || combined.includes('hospital') || combined.includes('health') || combined.includes('pharmacy')) return '💊';
  
  // Category fallbacks
  if (category.toLowerCase() === 'food') return '🍔';
  if (category.toLowerCase() === 'travel') return '🚌';
  if (category.toLowerCase() === 'shopping') return '🛍';
  if (category.toLowerCase() === 'college') return '🎓';
  if (category.toLowerCase() === 'recharge') return '⚡';
  if (category.toLowerCase() === 'entertainment') return '🎬';
  
  return '📦';
}

export function getCategoryEmoji(categoryName: string): string {
  return getSmartEmoji('', categoryName);
}
