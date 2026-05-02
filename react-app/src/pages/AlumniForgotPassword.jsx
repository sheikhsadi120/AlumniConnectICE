import ForgotPasswordBase from './ForgotPasswordBase'

function AlumniForgotPassword() {
  return (
    <ForgotPasswordBase
      userType="alumni"
      title="Alumni Password Reset"
      loginPath="/alumni-login"
    />
  )
}

export default AlumniForgotPassword
