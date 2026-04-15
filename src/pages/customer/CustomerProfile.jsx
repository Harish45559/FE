import React, { useState } from "react";
import customerApi from "../../services/customerApi";
import CustomerLayout from "../../components/CustomerLayout";
import "./CustomerProfile.css";

const CustomerProfile = () => {
  const stored = JSON.parse(localStorage.getItem("customer_user") || "{}");
  const [profile, setProfile] = useState({
    name: stored.name || "",
    phone: stored.phone || "",
    address_line1: stored.address_line1 || "",
    city: stored.city || "",
    postcode: stored.postcode || "",
  });
  const [passwords, setPasswords] = useState({
    current_password: "", new_password: "", confirm_password: "",
  });
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });
  const [passwordMsg, setPasswordMsg] = useState({ text: "", type: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleProfileChange = (e) =>
    setProfile({ ...profile, [e.target.name]: e.target.value });

  const handlePasswordChange = (e) =>
    setPasswords({ ...passwords, [e.target.name]: e.target.value });

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMsg({ text: "", type: "" });
    try {
      setProfileLoading(true);
      const res = await customerApi.put("/customer/profile", profile);
      localStorage.setItem("customer_user", JSON.stringify(res.data.customer));
      setProfileMsg({ text: "Profile updated successfully", type: "success" });
    } catch (err) {
      setProfileMsg({ text: err?.response?.data?.message || "Update failed", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: "", type: "" });
    if (passwords.new_password !== passwords.confirm_password) {
      return setPasswordMsg({ text: "Passwords do not match", type: "error" });
    }
    if (passwords.new_password.length < 8) {
      return setPasswordMsg({ text: "Password must be at least 8 characters", type: "error" });
    }
    try {
      setPasswordLoading(true);
      await customerApi.put("/customer/profile/password", {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPasswordMsg({ text: "Password changed successfully", type: "success" });
      setPasswords({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err) {
      setPasswordMsg({ text: err?.response?.data?.message || "Failed to change password", type: "error" });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <h1 className="c-page-title">My Profile</h1>
      <div className="cp-layout">

        {/* ── Profile Details ── */}
        <div className="c-card">
          <h3 className="cp-section-title">Personal Details</h3>
          {profileMsg.text && (
            <div className={profileMsg.type === "success" ? "c-success" : "c-error"}>
              {profileMsg.text}
            </div>
          )}
          <form onSubmit={handleProfileSave} className="cp-form">
            <div className="cp-field">
              <label className="c-label">Full Name</label>
              <input name="name" className="c-input" value={profile.name} onChange={handleProfileChange} />
            </div>
            <div className="cp-field">
              <label className="c-label">Phone</label>
              <input name="phone" className="c-input" value={profile.phone} onChange={handleProfileChange} />
            </div>
            <div className="cp-field">
              <label className="c-label">Address Line 1</label>
              <input name="address_line1" className="c-input" value={profile.address_line1} onChange={handleProfileChange} />
            </div>
            <div className="cp-row">
              <div className="cp-field">
                <label className="c-label">City</label>
                <input name="city" className="c-input" value={profile.city} onChange={handleProfileChange} />
              </div>
              <div className="cp-field">
                <label className="c-label">Postcode</label>
                <input name="postcode" className="c-input" value={profile.postcode} onChange={handleProfileChange} />
              </div>
            </div>
            <div className="cp-field cp-email-row">
              <label className="c-label">Email</label>
              <input className="c-input" value={stored.email || ""} disabled />
              <span className="cp-email-note">Email cannot be changed</span>
            </div>
            <button type="submit" className="c-btn c-btn-primary" disabled={profileLoading}>
              {profileLoading ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>

        {/* ── Change Password ── */}
        <div className="c-card">
          <h3 className="cp-section-title">Change Password</h3>
          {passwordMsg.text && (
            <div className={passwordMsg.type === "success" ? "c-success" : "c-error"}>
              {passwordMsg.text}
            </div>
          )}
          <form onSubmit={handlePasswordSave} className="cp-form">
            <div className="cp-field">
              <label className="c-label">Current Password</label>
              <input name="current_password" type="password" className="c-input"
                value={passwords.current_password} onChange={handlePasswordChange} />
            </div>
            <div className="cp-field">
              <label className="c-label">New Password</label>
              <input name="new_password" type="password" className="c-input"
                value={passwords.new_password} onChange={handlePasswordChange} />
            </div>
            <div className="cp-field">
              <label className="c-label">Confirm New Password</label>
              <input name="confirm_password" type="password" className="c-input"
                value={passwords.confirm_password} onChange={handlePasswordChange} />
            </div>
            <button type="submit" className="c-btn c-btn-primary" disabled={passwordLoading}>
              {passwordLoading ? "Changing…" : "Change Password"}
            </button>
          </form>
        </div>

      </div>
    </CustomerLayout>
  );
};

export default CustomerProfile;
