import test from "@/assets/home.jpeg";

import "./styles.scss";

function Profile() {
  return (
    <div className="profile">
      <img src={test} alt="test" className="profile__picture" />
      <div>
        <h2>Name</h2>
        <p>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Impedit ex
          alias quaerat ea unde illum, iure vel incidunt dolore voluptas ipsum
          soluta repudiandae eius delectus consequatur voluptatem! Porro, atque
          ullam?
        </p>
      </div>
    </div>
  );
}

export default Profile;
