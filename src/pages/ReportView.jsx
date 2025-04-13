import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const ReportView = () => {
  const { id } = useParams();
  const [reportHtml, setReportHtml] = useState('');

  useEffect(() => {
    fetch(`http://localhost:5000/api/reports/view/${id}`)
      .then((res) => res.text())
      .then(setReportHtml)
      .catch(() => setReportHtml('<p>Failed to load report</p>'));
  }, [id]);

  return (
    <div className="container mt-4">
      <h3>Report View</h3>
      <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
    </div>
  );
};

export default ReportView;
