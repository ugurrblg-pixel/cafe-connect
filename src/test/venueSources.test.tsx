import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VenueSources, venueSourceName } from '../components/VenueSources';
describe('venue source disclosure',()=>{
 it('renders nothing for empty results',()=>{expect(render(<VenueSources venues={[]} />).container).toBeEmptyDOMElement();});
 it('retains distinct provider credits and uses fixed safe links',()=>{
  render(<VenueSources venues={[{dataSource:'overture',attribution:'Required credit',license:'CDLA-Permissive-2.0'},{dataSource:'google'},{dataSource:'overture',attribution:'Required credit',license:'CDLA-Permissive-2.0'}]} />);
  fireEvent.click(screen.getByText('Mekan verileri ve kaynaklar'));
  expect(screen.getAllByText('Required credit')).toHaveLength(1);
  expect(screen.getByRole('link',{name:'Overture Maps'})).toHaveAttribute('href','https://docs.overturemaps.org/attribution/');
  expect(screen.getByRole('link',{name:'Google Maps'})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Lisans: CDLA-Permissive-2.0'})).toHaveAttribute('href','https://cdla.dev/permissive-2-0/');
 });
 it('does not turn source content into HTML or arbitrary links',()=>{
  render(<VenueSources venues={[{dataSource:'javascript:bad',attribution:'<script>bad</script>',license:'unknown'}]} />);
  fireEvent.click(screen.getByText('Mekan verileri ve kaynaklar'));
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(venueSourceName('unknown')).toBe('Mekan kaydı');
 });
});
