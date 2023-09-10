import "./styles.scss";

function Profile({ name, image, position, bio, fact, quote }: ProfileTypes) {
  return (
    <div className="profile">
      <img src={image} alt="test" className="profile__picture" />
      <div className="profile__content">
        <span className="profile__headline">
          <h3>{name}</h3>
          <p>{position}</p>
        </span>
        <p>{bio}</p>
        {quote && (
          <p>
            <b>Favourite science quote: </b>
            {quote}
          </p>
        )}
        {fact && (
          <p>
            <b>Favourite science fact: </b>
            {fact}
          </p>
        )}
      </div>
    </div>
  );
}

type ProfileTypes = {
  image: any;
  name: string;
  position: string;
  bio: string;
  fact?: string;
  quote?: string;
};

export default Profile;
