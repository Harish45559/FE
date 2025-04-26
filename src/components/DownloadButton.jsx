import React from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { CSVLink } from 'react-csv';

const DownloadButton = ({ csvData, csvHeaders, pdfTitle, pdfContent, fileName = 'file' }) => {
  
  const handlePdfDownload = () => {
    const doc = new jsPDF();

    if (pdfTitle) {
      doc.setFontSize(18);
      doc.text(pdfTitle, 14, 22);
    }

    if (Array.isArray(pdfContent)) {
      doc.autoTable({
        head: [Object.keys(pdfContent[0])],
        body: pdfContent.map(row => Object.values(row)),
        startY: pdfTitle ? 30 : 10,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    } else if (typeof pdfContent === 'string') {
      doc.setFontSize(12);
      doc.text(pdfContent, 14, 30);
    }

    doc.save(`${fileName}.pdf`);
  };

  return (
    <div className="flex gap-4">
      <CSVLink
        data={csvData}
        headers={csvHeaders}
        filename={`${fileName}.csv`}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition duration-200"
      >
        Download CSV
      </CSVLink>
      
      <button
        onClick={handlePdfDownload}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition duration-200"
      >
        Download PDF
      </button>
    </div>
  );
};

export default DownloadButton;
