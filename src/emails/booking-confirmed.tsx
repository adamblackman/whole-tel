import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Section,
  Preview,
} from '@react-email/components'

export interface BookingConfirmedEmailProps {
  propertyName: string
  checkIn: string
  checkOut: string
  guestCount: number
  total: string
}

export function BookingConfirmedEmail({
  propertyName,
  checkIn,
  checkOut,
  guestCount,
  total,
}: BookingConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your stay at {propertyName} is confirmed!</Preview>
      <Body style={body}>
        <Container style={container}>
          <Heading style={heading}>Booking Confirmed</Heading>
          <Text style={paragraph}>
            Your stay at <strong>{propertyName}</strong> is confirmed.
          </Text>
          <Hr style={hr} />
          <Section style={details}>
            <Text style={detailRow}>
              <strong>Check-in:</strong> {checkIn}
            </Text>
            <Text style={detailRow}>
              <strong>Check-out:</strong> {checkOut}
            </Text>
            <Text style={detailRow}>
              <strong>Guests:</strong> {guestCount}
            </Text>
            <Text style={detailRow}>
              <strong>Total:</strong> ${total}
            </Text>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Thanks for booking with Whole-Tel!</Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingConfirmedEmail

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

const footer: React.CSSProperties = {
  fontSize: '14px',
  color: '#888888',
  margin: '0',
}
