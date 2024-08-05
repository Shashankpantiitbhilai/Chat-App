import React, { useContext } from "react";
import { AdminContext } from "../../App";

const Home = () => {
  const { IsUserLoggedIn } = useContext(AdminContext);
console.log(IsUserLoggedIn)
  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      {IsUserLoggedIn ? (
        <p>User is logged in. Welcome, {IsUserLoggedIn.email || "User"}!</p>
      ) : (
        <p>User is not logged in.</p>
      )}
    </div>
  );
};

export default Home;
