import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api'; // ✅ use axios instance

const ReportView = () => {
  const { id } = useParams();
  const [reportHtml, setReportHtml] = useState('');

  useEffect(() => {
    api.get(`/reports/view/${id}`)
      .then((res) => setReportHtml(res.data)) // ✅ axios returns res.data
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
