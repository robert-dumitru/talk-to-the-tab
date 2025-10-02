interface HomeProps {
  user: { name: string; email: string; picture: string }
  onSignOut: () => void
}

export default function Home({ user, onSignOut }: HomeProps) {
  return (
    <div>
      <h2>Welcome, {user.name}!</h2>
      <p>Email: {user.email}</p>
      <button onClick={onSignOut}>Sign Out</button>
    </div>
  )
}
