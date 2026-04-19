import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const FeeReminder = () => {
    const [rollNo, setRollNo] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendReminder = async () => {
        if (!rollNo) {
            toast.error("Please enter a roll number");
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('http://localhost:5000/api/fees/reminder', 
                { rollNo },
                { 
                    headers: { 
                        'Authorization': `Bearer ${token}` 
                    } 
                }
            );

            if (res.data.success) {
                toast.success("Reminder sent successfully");
                setRollNo(''); // Clear input
            } else {
                toast.error(res.data.message || "Failed to send reminder");
            }
        } catch (error) {
            console.error("Fee Reminder API Error:", error);
            const msg = error.response?.data?.message || "Error connecting to server";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ 
            padding: '24px', 
            borderRadius: '16px', 
            background: '#fff', 
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            border: '1px solid #eee',
            maxWidth: '500px',
            margin: '0 auto 32px'
        }}>
            <h3 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '800', color: '#111' }}>
                Send Fee Reminder
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                    <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        fontWeight: '700', 
                        color: '#6B7280', 
                        marginBottom: '8px'
                    }}>
                        Roll Number
                    </label>
                    <input 
                        type="text" 
                        placeholder="Enter Roll Number" 
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                        style={{ 
                            width: '100%', 
                            padding: '12px 16px', 
                            borderRadius: '12px', 
                            border: '1px solid #E5E7EB', 
                            fontSize: '14px',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendReminder()}
                    />
                </div>

                <button 
                    onClick={handleSendReminder}
                    disabled={!rollNo || loading}
                    style={{ 
                        width: '100%', 
                        padding: '13px', 
                        borderRadius: '12px', 
                        background: loading ? '#9CA3AF' : '#3B5BDB', 
                        color: '#fff', 
                        fontWeight: '700', 
                        border: 'none', 
                        cursor: (!rollNo || loading) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        fontSize: '14px'
                    }}
                >
                    {loading ? 'Sending...' : 'Send Reminder'}
                </button>
            </div>
        </div>
    );
};

export default FeeReminder;
