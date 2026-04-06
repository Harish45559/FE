import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./HeldOrders.css";

const HeldOrders = () => {
  const [heldOrders, setHeldOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const fetchHeldOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders/held");
      setHeldOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("Failed to load held orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeldOrders();
  }, []);

  const handleResume = (order) => {
    localStorage.setItem("resumedOrder", JSON.stringify(order));
    navigate("/billing");
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this held order?")) return;
    try {
      await api.delete(`/orders/held/${id}`);
      setHeldOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to delete";
      alert(message);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all held orders?")) return;
    try {
      await api.delete("/orders/held/clear-all");
      setHeldOrders([]);
    } catch (err) {
      const message = err?.response?.data?.error || "Failed to clear";
      alert(message);
    }
  };

  return (
    <DashboardLayout>
      <div className="held-orders-wrapper">
        <h2 id="held-orders-title">🕒 Held Orders</h2>

        {error && (
          <div style={{ color: "red", marginBottom: "10px" }}>⚠️ {error}</div>
        )}

        {loading ? (
          <p>Loading...</p>
        ) : heldOrders.length === 0 ? (
          <p>No held orders.</p>
        ) : (
          <>
            <table className="held-orders-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {heldOrders.map((order) => (
                  <tr key={order.id} id={`held-row-${order.id}`}>
                    <td>#{order.display_number || order.id}</td>
                    <td>{order.customer_name || "N/A"}</td>
                    <td>{order.items?.length}</td>
                    <td>{order.date}</td>
                    <td>
                      <button id={`held-resume-${order.id}`} onClick={() => handleResume(order)}>
                        Resume
                      </button>
                      <button
                        id={`held-delete-${order.id}`}
                        onClick={() => handleDelete(order.id)}
                        style={{ marginLeft: "8px", color: "red" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button id="held-btn-clear-all" className="clear-btn" onClick={handleClearAll}>
              Clear All
            </button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HeldOrders;
