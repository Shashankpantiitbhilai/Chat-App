import axios from "axios";

const baseURL =
    import.meta.env.MODE === "production"
        ? import.meta.env.VITE_BACKEND_PROD
        : import.meta.env.VITE_BACKEND_DEV;

console.log(baseURL, "Chat service base URL");

const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});
export async function getMembers() {
    try {
        const response = await axiosInstance.get('/chat/getMembers');
        return response.data.members;
    } catch (error) {
        console.error("Error fetching members:", error);
        throw error;
    }
}
export async function getAllUsers() {
    try {
      
        const response = await axiosInstance.get('/chat/getAllUsers');
        console.log(response.data.users)
        return response.data.users;
    } catch (error) {
        console.error("Error fetching users:", error);
        throw error;
    }
}

export async function addMember(memberId) {
    try {
        console.log(memberId)
        const response = await axiosInstance.post('/chat/addMember', { memberId });
        return response.data;
    } catch (error) {
        console.error("Error adding member:", error);
        throw error;
    }
}
export async function getConversation(recipientId, page = 1, limit = 50) {
    try {
        const response = await axiosInstance.get(`/chat/messages/${recipientId}`, {
            params: { page, limit }
        });
        return response.data;
    } catch (error) {
        console.error("Error fetching conversation:", error);
        throw error;
    }
}

export async function sendMessage(recipientId, content) {
    try {
        const response = await axiosInstance.post('/chat/messages', { recipientId, content });
        return response.data;
    } catch (error) {
        console.error("Error sending message:", error);
        throw error;
    }
}

export async function editMessage(messageId, content) {
    try {
        const response = await axiosInstance.put(`/chat/messages/${messageId}`, { content });
        return response.data;
    } catch (error) {
        console.error("Error editing message:", error);
        throw error;
    }
}

export async function deleteMessage(messageId) {
    try {
        const response = await axiosInstance.delete(`/chat/messages/${messageId}`);
        return response.data;
    } catch (error) {
        console.error("Error deleting message:", error);
        throw error;
    }
}

export async function markAsDelivered(messageId) {
    try {
        const response = await axiosInstance.put(`/chat/messages/${messageId}/deliver`);
        return response.data;
    } catch (error) {
        console.error("Error marking message as delivered:", error);
        throw error;
    }
}

export async function markAsRead(messageId) {
    try {
        const response = await axiosInstance.put(`/chat/messages/${messageId}/read`);
        return response.data;
    } catch (error) {
        console.error("Error marking message as read:", error);
        throw error;
    }
}

export async function getOnlineStatus(userId) {
    try {
        const response = await axiosInstance.get(`/chat/users/${userId}/status`);
        return response.data;
    } catch (error) {
        console.error("Error fetching online status:", error);
        throw error;
    }
}