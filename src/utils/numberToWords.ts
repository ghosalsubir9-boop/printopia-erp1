export function numberToWordsIndian(num: number): string {
  if (num === 0) return 'Zero';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const numStr = num.toFixed(2);
  const parts = numStr.split('.');
  const integerPart = parseInt(parts[0], 10);
  const paisePart = parseInt(parts[1], 10);

  function convertNumber(n: number): string {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertNumber(n % 100) : '');
    
    // For thousands and lakhs
    // Since n is < 1,00,00,000 (1 crore), we can handle up to 99,99,999
    if (n < 100000) return convertNumber(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertNumber(n % 1000) : '');
    if (n < 10000000) return convertNumber(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convertNumber(n % 100000) : '');
    
    // For crores
    return convertNumber(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convertNumber(n % 10000000) : '');
  }

  let words = convertNumber(integerPart);
  
  let result = `Rupees ${words}`;
  
  if (paisePart > 0) {
    result += ` and ${convertNumber(paisePart)} Paise`;
  }
  
  return result + ' Only';
}
