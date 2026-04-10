import ForgotPasswordBase from './ForgotPasswordBase'

function StudentForgotPassword() {
  return (
    <ForgotPasswordBase
      userType="student"
      title="Student Password Reset"
      loginPath="/student-login"
    />
  )
}

export default StudentForgotPassword
