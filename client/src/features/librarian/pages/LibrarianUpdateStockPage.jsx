import React, { useState } from "react";
import "../styles/LibrarianPages.css";

const LibrarianUpdateStockPage = () => {
  const [catalog, setCatalog] = useState([
    {
      id: "BK-001",
      title: "Introduction to Algorithms (CLRS)",
      category: "Computer Science",
      totalStock: 15,
      available: 9,
      issued: 6,
    },
    {
      id: "BK-002",
      title: "Database System Concepts",
      category: "Computer Science",
      totalStock: 12,
      available: 7,
      issued: 5,
    },
    {
      id: "BK-003",
      title: "Operating System Concepts",
      category: "Computer Science",
      totalStock: 10,
      available: 4,
      issued: 6,
    },
    {
      id: "BK-004",
      title: "Digital Logic & Computer Design",
      category: "Electronics",
      totalStock: 20,
      available: 16,
      issued: 4,
    },
  ]);

  const [synced, setSynced] = useState(false);

  const handleStockChange = (id, delta) => {
    setCatalog((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newTotal = Math.max(0, item.totalStock + delta);
          const newAvailable = Math.max(0, item.available + delta);
          return {
            ...item,
            totalStock: newTotal,
            available: newAvailable,
          };
        }
        return item;
      })
    );
    setSynced(false);
  };

  const handleSyncInventory = () => {
    setSynced(true);
    setTimeout(() => setSynced(false), 3000);
  };

  return (
    <div className="librarian-flow-page">
      <div className="flow-page-header">
        <div className="flow-badge">Step 4: Update Stock</div>
        <h2>Final Inventory Sync</h2>
        <p>Manage physical library copies, restock titles, and synchronize central database</p>
      </div>

      {synced && (
        <div className="alert-sync-success">
          ✅ Central Catalog Inventory synchronized successfully across all library domains!
        </div>
      )}

      <div className="flow-card">
        <div className="card-header-flex">
          <h3>Catalog Inventory List</h3>
          <button
            type="button"
            className="btn-action primary"
            onClick={handleSyncInventory}
          >
            🔄 Sync Inventory Now
          </button>
        </div>

        <div className="table-responsive">
          <table className="flow-table">
            <thead>
              <tr>
                <th>Book ID</th>
                <th>Title & Category</th>
                <th>Total Stock</th>
                <th>Available</th>
                <th>Currently Issued</th>
                <th>Adjust Stock</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono">{item.id}</td>
                  <td>
                    <strong>{item.title}</strong>
                    <div className="sub-text">{item.category}</div>
                  </td>
                  <td>
                    <span className="stock-count total">{item.totalStock}</span>
                  </td>
                  <td>
                    <span className="stock-count avail">{item.available}</span>
                  </td>
                  <td>
                    <span className="stock-count issued">{item.issued}</span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button
                        type="button"
                        className="btn-stock-adj"
                        onClick={() => handleStockChange(item.id, 1)}
                      >
                        + 1 Copy
                      </button>
                      <button
                        type="button"
                        className="btn-stock-adj danger"
                        onClick={() => handleStockChange(item.id, -1)}
                      >
                        - 1 Copy
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LibrarianUpdateStockPage;
