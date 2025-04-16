import React, { useEffect, useRef, useState } from "react";
import api from "../services/api";
import DashboardLayout from "../components/DashboardLayout";
import { DateTime } from "luxon";
import "./PreviousOrders.css";

const PreviousOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [viewOrder, setViewOrder] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const [selectedDate, setSelectedDate] = useState("");
  const printRef = useRef();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const filtered = orders.filter((o) => {
      const matchSearch =
        o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        String(o.order_number).includes(search);

      const matchDate = selectedDate
        ? DateTime.fromISO(o.created_at, { zone: "utc" })
            .setZone("Europe/London")
            .toISODate() === selectedDate
        : true;

      return matchSearch && matchDate;
    });

    const startIndex = (currentPage - 1) * ordersPerPage;
    setFilteredOrders(filtered.slice(startIndex, startIndex + ordersPerPage));
  }, [orders, search, currentPage, selectedDate]);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders/all");
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to fetch orders", err);
    }
  };

  const totalPages = Math.ceil(
    orders.filter((o) => {
      const matchSearch =
        o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
        String(o.order_number).includes(search);

      const matchDate = selectedDate
        ? DateTime.fromISO(o.created_at, { zone: "utc" })
            .setZone("Europe/London")
            .toISODate() === selectedDate
        : true;

      return matchSearch && matchDate;
    }).length / ordersPerPage
  );

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=600,height=600");
    printWindow.document.write(`
      <html><head><title>Receipt</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 11px;
          padding: 0;
          margin: 0;
          background: white;
          width: 80mm;
        }
        .receipt-header, .receipt-summary, table {
          width: 100%;
        }
        table {
          border-collapse: collapse;
          font-size: 11px;
        }
        th, td {
          border-bottom: 1px dotted #ccc;
          padding: 4px;
          text-align: left;
        }
        h2 {
          text-align: center;
          font-size: 16px;
          margin: 4px 0;
        }
      </style>
      </head><body>
    `);
    printWindow.document.write(printRef.current.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const clearSearch = () => {
    setSearch("");
    setSelectedDate("");
    setCurrentPage(1);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await api.delete(`/orders/${id}`);
      fetchOrders();
    } catch {
      alert("Failed to delete order");
    }
  };

  return (
    <DashboardLayout>
      <div className="previous-orders">
        <div className="header">
          <h2>Previous Orders</h2>
          <div className="controls">
            <input
              type="text"
              placeholder="Search by name/order no"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="search-box"
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className="date-picker"
            />
            <button onClick={clearSearch} className="clear-btn">Clear</button>
          </div>
        </div>

        <table className="orders-table">
          <thead>
            <tr>
              <th>#Order</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Date</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>#{order.order_number}</td>
                <td>{order.customer_name}</td>
                <td>{order.order_type}</td>
                <td>{order.date}</td>
                <td>£{order.total_amount?.toFixed(2)}</td>
                <td>
                  <button className="view-btn" onClick={() => setViewOrder(order)}>👁️</button>
                  <button className="view-btn" style={{ color: "red" }} onClick={() => handleDelete(order.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => setCurrentPage(i + 1)} className={currentPage === i + 1 ? "active" : ""}>
              {i + 1}
            </button>
          ))}
        </div>

        {viewOrder && (
          <div className="receipt-modal">
            <div>
              <div className="bill-section" ref={printRef}>
                <button className="close-preview-btn" onClick={() => setViewOrder(null)}>✖ Close</button>
                <div className="receipt-header">
                  <h2>Cozy Cup</h2>
                  <p>Food Truck Lane, Flavor Town</p>
                  <p>Phone: +91-9876543210</p>
                  <p>www.cozycup.example.com</p>
                  <p>Order Type: {viewOrder.order_type}</p>
                  <p><strong>Customer:</strong> {viewOrder.customer_name || "N/A"}</p>
                  <p><strong>Order No:</strong> #{viewOrder.order_number}</p>
                  <hr />
                  <p>Date: {viewOrder.date}</p>
                  <hr />
                </div>

                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewOrder.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name}</td>
                        <td>£{item.price}</td>
                        <td>{item.qty}</td>
                        <td>£{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="receipt-summary">
                  <p><strong>Total Qty:</strong> {viewOrder.items.reduce((sum, i) => sum + i.qty, 0)}</p>
                  <p><strong>Sub Total:</strong> £{viewOrder.total_amount?.toFixed(2)}</p>
                  <p>VAT (5%): £{(viewOrder.total_amount * 5 / 105).toFixed(2)}</p>
                  <p>Service (5%): £{(viewOrder.total_amount * 5 / 105).toFixed(2)}</p>
                  <hr />
                  <p className="grand-total"><strong>Grand Total:</strong> £{viewOrder.total_amount?.toFixed(2)}</p>
                  <p className="server-name">Staff: {viewOrder.server_name}</p>
                </div>
              </div>

              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <button className="print-btn" onClick={handlePrint}>🖨️ Print</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PreviousOrders;
