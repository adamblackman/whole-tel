import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export interface BookingRow {
  id: string
  check_in: string
  check_out: string
  guest_count: number
  total: number
  status: 'pending' | 'confirmed' | 'cancelled'
  created_at: string
  properties: {
    id: string
    name: string
  }
}

interface BookingsTableProps {
  bookings: BookingRow[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: BookingRow['status'] }) {
  if (status === 'confirmed') {
    return <Badge variant="default">Confirmed</Badge>
  }
  if (status === 'pending') {
    return <Badge variant="secondary">Pending</Badge>
  }
  return <Badge variant="destructive">Cancelled</Badge>
}

export function BookingsTable({ bookings }: BookingsTableProps) {
  if (bookings.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No bookings yet</p>
        <p className="text-sm mt-1">Bookings will appear here once guests complete reservations.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Property</TableHead>
            <TableHead>Check-in</TableHead>
            <TableHead>Check-out</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Booked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell className="font-medium">{booking.properties.name}</TableCell>
              <TableCell>{formatDate(booking.check_in)}</TableCell>
              <TableCell>{formatDate(booking.check_out)}</TableCell>
              <TableCell>{booking.guest_count}</TableCell>
              <TableCell>${booking.total.toFixed(2)}</TableCell>
              <TableCell>
                <StatusBadge status={booking.status} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(booking.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
