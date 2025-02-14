import axios from "axios";

const API_URL = "/api/tokens"; // Ensure it's only "/api/tokens"

export const getTokenList = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const addToken = async (mint) => {
  const response = await axios.post(API_URL, { address: mint.mint });
  return response.data;
};

export const deleteToken = async (address) => {
  const response = await axios.delete(`${API_URL}/${address}`);
  return response.data;
};
