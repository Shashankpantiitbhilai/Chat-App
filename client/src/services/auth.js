import axios from "axios";

const baseURL =
    import.meta.env.MODE === "production"
        ? import.meta.env.VITE_BACKEND_PROD
        : import.meta.env.VITE_BACKEND_DEV;
console.log(baseURL,"pppppppppp")
const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

export async function fetchCredentials() {
    console.log("kkkkkkkkkkkkkkkkkkkk")
    try {
        const response = await axiosInstance.get("/auth/fetchAuth");
        return response.data;
    } catch (error) {
        return null;
    }
}

export async function registerUser(email, password) {
    try {
        const response = await axiosInstance.post("/auth/register", { email, password });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 400) {
            return { message: "User already exists" };
        } else {
            return null;
        }
    }
}

export async function verifyOTPAndRegisterUser(otp, id) {
    try {
        const response = await axiosInstance.post("/auth/otp-verify", { otp, id });
        if (response.status === 201) {
            return { success: true, message: "User registered successfully", user: response };
        } else if (response.status === 400) {
            throw new Error("Invalid OTP: " + response.data.message);
        } else {
            throw new Error("Error registering user: " + response.data.message);
        }
    } catch (error) {
        throw error;
    }
}

export async function loginUser(email, password) {
    try {
        email = email.toLowerCase();
        const response = await axiosInstance.post("/auth/login", { email, password });
        return response.data;
    } catch (error) {
        return null;
    }
}

export async function registerStudentId(id, ID_No) {
    try {
        const response = await axiosInstance.post("/auth/google/register", { id, ID_No });
        return response.data;
    } catch (error) {
        return null;
    }
}

export async function logoutUser() {
    try {
        await axiosInstance.post("/auth/logout");
        return;
    } catch (error) {
    }
}

export async function forgotPassword(email) {
    try {
        const response = await axiosInstance.post("/auth/forgot-password", { email });
        if (response.data.Status === "Success") {
            return response.data;
        }
    } catch (error) {
    }
}

export async function resetPassword(password, id, token) {
    try {
        const response = await axiosInstance.post(`/auth/reset-password/${id}/${token}`, { password });
        if (response.data.success) {
            return { success: true, message: "Password reset successfully" };
        } else {
            throw new Error("Error resetting password: " + response.data.message);
        }
    } catch (error) {
        throw error;
    }
}
