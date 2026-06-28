export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    alert('No data available to export');
    return;
  }

  const headers = Object.keys(data[0]).filter(key => key !== 'rowIndex' && key !== 'timestamp');
  
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let cell = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        // Escape quotes
        cell = cell.replace(/"/g, '""');
        // Wrap in quotes if it contains comma, newline or quotes
        if (cell.search(/("|,|\n)/g) >= 0) {
          cell = `"${cell}"`;
        }
        return cell;
      }).join(',')
    )
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
