import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import { useNavigate } from "react-router-dom";
import "./HeldOrders.css";


const HeldOrders = () => {
  const [heldOrders, setHeldOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("heldOrders")) || [];
    setHeldOrders(stored);
  }, []);

  const handleResume = (order) => {
    localStorage.setItem("resumedOrder", JSON.stringify(order));
    navigate("/billing");
  };

  const handleDelete = (id) => {
    const filtered = heldOrders.filter((o) => o.id !== id);
    localStorage.setItem("heldOrders", JSON.stringify(filtered));
    setHeldOrders(filtered);
  };

  const handleClearAll = () => {
    localStorage.removeItem("heldOrders");
    setHeldOrders([]);
  };

  return (
    <DashboardLayout>
      <div className="held-orders-wrapper">
        <h2>🕒 Held Orders</h2>
        {heldOrders.length === 0 ? (
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
                  <tr key={order.id}>
                    <td>#{order.displayNumber || order.id}</td>
                    <td>{order.customer || "N/A"}</td>
                    <td>{order.items.length}</td>
                    <td>{order.date}</td>

                    <td>
                      <button onClick={() => handleResume(order)}>Resume</button>
                      <button
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
            <button className="clear-btn" onClick={handleClearAll}>
              Clear All
            </button>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default HeldOrders;
