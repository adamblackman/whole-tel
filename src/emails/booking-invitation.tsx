import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Section,
  Preview,
} from '@react-email/components'

export interface BookingInvitationEmailProps {
  inviterName: string
  propertyName: string
  location: string
  checkIn: string
  checkOut: string
  acceptUrl: string
}

export function BookingInvitationEmail({
  inviterName,
  propertyName,
  location,
  checkIn,
  checkOut,
  acceptUrl,
}: BookingInvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to stay at {propertyName}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>You&apos;re Invited!</Heading>
          <Text style={paragraph}>
            <strong>{inviterName}</strong> has invited you to join their stay at{' '}
            <strong>{propertyName}</strong>.
          </Text>
          <Hr style={hr} />
          <Section style={details}>
            <Text style={detailRow}>
              <strong>Property:</strong> {propertyName}
            </Text>
            <Text style={detailRow}>
              <strong>Location:</strong> {location}
            </Text>
            <Text style={detailRow}>
              <strong>Check-in:</strong> {checkIn}
            </Text>
            <Text style={detailRow}>
              <strong>Check-out:</strong> {checkOut}
            </Text>
          </Section>
          <Hr style={hr} />
          <Section style={buttonSection}>
            <Button style={button} href={acceptUrl}>
              View Invitation
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            You received this because someone invited you on Whole-Tel. If you
            don&apos;t have an account yet, you can create one when you view the
            invitation.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingInvitationEmail

const body: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 24px',
  maxWidth: '480px',
  borderRadius: '8px',
}

const heading: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#1a1a1a',
  margin: '0 0 16px',
}

const paragraph: React.CSSProperties = {
  fontSize: '16px',
  lineHeight: '1.5',
  color: '#333333',
  margin: '0 0 24px',
}

const hr: React.CSSProperties = {
  borderColor: '#e6e6e6',
  margin: '24px 0',
}

const details: React.CSSProperties = {
  margin: '0',
}

const detailRow: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#333333',
  margin: '4px 0',
}

const buttonSection: React.CSSProperties = {
  textAlign: 'center' as const,
}

const button: React.CSSProperties = {
  backgroundColor: '#0d9488',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
}

const footer: React.CSSProperties = {
  fontSize: '14px',
  color: '#888888',
  margin: '0',
}
