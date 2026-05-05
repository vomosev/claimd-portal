'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Award } from '@/services/api';
import { useRouter } from 'next/navigation';
import dummyLogo from '@/assets/dummy-card-logo.png';
import dummyImg from '@/assets/dummy-card-image.png';
import toast from 'react-hot-toast';
import axios from "axios";
import { useState, useEffect } from "react";

const worldId = process.env.NEXT_PUBLIC_WORLDID || "0";
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://nodejs.gridiron-app.com";

export default function WorldCard({
  award,
  claimedIsVisible = true,
}: {
  award?: Award;
  claimedIsVisible?: boolean;
}) {

  const [currentUsername, setCurrentUsername] = useState("");
  const [currentStreetTeam, setCurrentStreetTeam] = useState(false);

  let claimButtonState = { text: "Join Team", disabled: false };

  useEffect(() => {
    const username = localStorage.getItem("username") ?? "";
    setCurrentUsername(username);
  }, []);

  useEffect(() => {
    console.log("Updated username:", currentUsername);
  }, [currentUsername]);

  const router = useRouter();
  const displayData = award || {
    worldname: 'Geo-Drops Asset',
    description: 'New Location',
    worldimg: '',
  };

  useEffect(() => {
    if (!currentUsername || !award?.worldid) return;

    const getStreetTeamStatus = async () => {
      try {
        const { data } = await axios.get(
          `${apiUrl}/getstreetteam/${currentUsername}/${award.worldid}`
        );

        setCurrentStreetTeam(!!data.isMember);
      } catch (err) {
        console.error("Street team check failed", err);
      }
    };

    getStreetTeamStatus();
  }, [currentUsername, award?.worldid]);

  const handleView = async () => {
    if (!currentUsername || !award?.worldid) {
      console.error('No username or dropsite ID available');
      toast.error('No username or dropsite ID available');
      return;
    }

    try {
      window.open(`${award.publicurl}`, '_blank');
    } catch (error) {
      console.error('Error during view process:', error);
      toast.error('Error processing view');
    }
  };

  const streetTeam = async () => {

    if (!currentUsername) {
      toast.error('No username available');
      return;
    }

    if (!award?.worldid) {
      toast.error('No dropsite ID available');
      return;
    }
    const userid = currentUsername;
    const worldid = String(award.worldid);

    console.log("---------- userid:", userid);
    console.log("---------- worldid:", worldid);

    try {
      let endpoint = "joinstreetteam";
      let joinstatus = true;
      if (currentStreetTeam){
        endpoint = "leavestreetteam";
        joinstatus = false;
      }
        const response = await axios.post(
          `${apiUrl}/${endpoint}`,
          {
            userid:  userid,
            worldid: worldid,
          },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

      if (response.data.success) {
        toast.success(`${endpoint} successful!`);
        setCurrentStreetTeam(joinstatus);
      }
    } catch (error) {
      console.error('error:', error);
      toast.error('Could not join street team');
    }
  };

  return (
    <div
      className='bg-white dark:bg-[#151E3A] dark:border dark:border-[#2D385B] rounded-[10px] p-4 w-full cursor-pointer'
   >
      {/* Header */}
      <div className='flex items-start gap-4 mb-4'>
        <Image
          src={dummyLogo}
          alt='Logo'
          width={50}
          height={50}
          className='rounded-full'
          onClick={handleView}
         />
        <div>
          <h2 className='font-extrabold tracking-normal leading-[1.2] pr-10'>
            {displayData.worldname}
          </h2>
          <p className='text-xs text-[#8E91A0] dark:text-[#9CB0DA] mt-0.5 font-semibold'>
            {displayData.description}
          </p>
        </div>
      </div>

      {/* Drop Image */}
      <div className='overflow-hidden rounded-[10px]'>
        <Image
          src={displayData.worldimg ? `${displayData.worldimg}` : dummyImg}
          alt={displayData.worldname || 'Drop Image'}
          width={1000}
          height={1000}
          className='w-full aspect-square object-cover'
          unoptimized
          onError={(e) => {
            console.error('Image failed to load:', displayData.worldimg);
            const target = e.target as HTMLImageElement;
            if (target.src !== dummyImg.src) {
              target.src = dummyImg.src;
            }
          }}
          onLoad={() => {
            console.log('Image loaded successfully:', displayData.worldimg);
          }}
          onClick={handleView}
        />
      </div>

      {claimedIsVisible && (
        <div className='mt-3'>
          <p className='mb-3 font-extrabold leading-[1.2]'>
            Site ID: {award?.worldid}
          </p>

          {/* Claimed Avatars */}
          <div className='flex items-center justify-between'>
            {/* Buttons */}
            <div className='flex gap-1.5'>
              <Button
                size='sm'
                className='bg-clgeodrops hover:opacity-60 duration-200 ease-in-out text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed px-5 geo-claim-button'
                onClick={handleView}
              >
                View Site
              </Button>
              {currentUsername && (
                <Button
                  // disabled={currentStreetTeam}
                  size="sm"
                  variant="outline"
                  className="rounded-full disabled:opacity-50 disabled:cursor-not-allowed px-5"
                  onClick={streetTeam}
                >
                  {currentStreetTeam ? "Leave Street Team" : "Join Street Team"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
